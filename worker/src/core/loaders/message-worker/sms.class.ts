import { Sequelize } from 'sequelize-typescript'
import { QueryTypes, Transaction } from 'sequelize'
import map from 'lodash/map'
import { loggerWithLabel } from '@core/logger'
import config from '@core/config'
import { CredentialService } from '@core/services/credential.service'
import { PhoneNumberService } from '@shared/utils/phone-number.service'
import { TemplateClient, XSS_SMS_OPTION } from '@shared/templating'
import TwilioClient from '@sms/services/twilio-client.class'
import SnsSmsClient from '@sms/services/sns-sms-client.class'

const templateClient = new TemplateClient({ xssOptions: XSS_SMS_OPTION })
const logger = loggerWithLabel(module)

class SMS {
  private workerId: string
  private connection: Sequelize
  private smsClient: TwilioClient | SnsSmsClient | null
  constructor(workerId: string, connection: Sequelize) {
    this.workerId = workerId
    this.connection = connection
    this.smsClient = null
  }

  enqueueMessages(jobId: number, campaignId: number): Promise<void> {
    return this.connection
      .transaction(async (transaction: Transaction) => {
        await this.connection.query('SELECT enqueue_messages_sms(:job_id);', {
          replacements: { job_id: jobId },
          type: QueryTypes.SELECT,
          transaction,
        })
        // This is to ensure that stats count tally with total count during sending
        // as enqueue step may set messages as invalid
        await this.connection.query('SELECT update_stats_sms(:campaign_id);', {
          replacements: { campaign_id: campaignId },
          type: QueryTypes.SELECT,
          transaction,
        })
      })
      .then(() => {
        logger.info({
          message: 'Enqueued sms messages',
          workerId: this.workerId,
          jobId,
          action: 'enqueueMessages',
        })
      })
  }

  async getMessages(
    jobId: number,
    rate: number
  ): Promise<
    {
      id: number
      recipient: string
      params: { [key: string]: string }
      body: string
      campaignId: number
    }[]
  > {
    const dbResults = await this.connection.query(
      'SELECT get_messages_to_send_sms(:job_id, :rate);',
      {
        replacements: { job_id: jobId, rate },
        type: QueryTypes.SELECT,
      }
    )
    const result = map(dbResults, 'get_messages_to_send_sms')
    return result
  }

  sendMessage({
    id,
    recipient,
    params,
    body,
    campaignId,
  }: {
    id: number
    recipient: string
    params: { [key: string]: string }
    body: string
    campaignId?: number
  }): Promise<void> {
    return new Promise<string>((resolve, reject) => {
      try {
        const normalisedRecipient = PhoneNumberService.normalisePhoneNumber(
          recipient,
          config.get('defaultCountry')
        )
        return resolve(normalisedRecipient)
      } catch (err) {
        return reject(err)
      }
    })
      .then((normalisedRecipient: string) => {
        return this.smsClient?.send(
          id,
          normalisedRecipient,
          templateClient.template(body, params),
          campaignId
        )
      })
      .then((messageId) => {
        return this.connection.query(
          `UPDATE sms_ops SET status='SENDING', delivered_at=clock_timestamp(), message_id=:messageId, updated_at=clock_timestamp() WHERE id=:id;`,
          { replacements: { id, messageId }, type: QueryTypes.UPDATE }
        )
      })
      .catch((error: Error) => {
        return this.connection.query(
          `UPDATE sms_ops SET status='ERROR', delivered_at=clock_timestamp(), error_code=:error, updated_at=clock_timestamp() WHERE id=:id;`,
          {
            replacements: { id, error: error.message.substring(0, 255) },
            type: QueryTypes.UPDATE,
          }
        )
      })
      .then(() => {
        logger.info({
          message: 'Sent sms message',
          workerId: this.workerId,
          id,
          action: 'sendMessage',
        })
      })
  }

  async setSendingService(credentialName: string): Promise<void> {
    const credentials = await CredentialService.getTwilioCredentials(
      credentialName
    )
    this.smsClient = config.get('smsFallback.activate')
      ? new SnsSmsClient()
      : new TwilioClient(credentials)
  }

  destroySendingService(): void {
    this.smsClient = null
  }
}

export default SMS
