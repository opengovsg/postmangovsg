import { Sequelize } from 'sequelize-typescript'
import WhatsappClient from '@shared/clients/whatsapp-client.class'
import { loggerWithLabel } from '@core/logger'
import { QueryTypes, Transaction } from 'sequelize'
import map from 'lodash/map'
import { PhoneNumberService } from '@core/services/phone-number.service'
import config from '@core/config'
import { CredentialService } from '@core/services/credential.service'

const logger = loggerWithLabel(module)

class Whatsapp {
  private workerId: string
  private connection: Sequelize
  private whatsappClient: WhatsappClient | null = null

  constructor(workerId: string, connection: Sequelize) {
    this.workerId = workerId
    this.connection = connection
    this.whatsappClient = null
  }

  enqueueMessages(jobId: number, campaignId: number): Promise<void> {
    return this.connection
      .transaction(async (transaction: Transaction) => {
        await this.connection.query(
          'SELECT enqueue_messages_whatsapp(:job_id);',
          {
            replacements: { job_id: jobId },
            type: QueryTypes.SELECT,
            transaction,
          }
        )
        // This is to ensure that stats count tally with total count during sending
        // as enqueue step may set messages as invalid
        await this.connection.query(
          'SELECT update_stats_whatsapp(:campaign_id);',
          {
            replacements: { campaign_id: campaignId },
            type: QueryTypes.SELECT,
            transaction,
          }
        )
      })
      .then(() => {
        logger.info({
          message: 'Enqueued whatsapp messages',
          workerId: this.workerId,
          jobId,
          action: 'enqueueMessages',
        })
      })
  }

  getMessages(
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
    return this.connection
      .query('SELECT get_messages_to_send_whatsapp(:job_id, :rate);', {
        replacements: { job_id: jobId, rate },
        type: QueryTypes.SELECT,
      })
      .then((result) => map(result, 'get_messages_to_send_whatsapp'))
  }

  sendMessage({
    id,
    from,
    recipient,
    body,
  }: {
    id: number
    from: string
    recipient: string
    body: string
  }): Promise<void> {
    return new Promise<string>((resolve, reject) => {
      try {
        const normalisedRecipient = PhoneNumberService.normalisePhoneNumber(
          recipient,
          config.get('defaultCountry')
        )
        return resolve(normalisedRecipient)
      } catch (err) {
        return reject(new Error('Recipient is incorrectly formatted'))
      }
    })
      .then((normalisedRecipient: string) => {
        return this.whatsappClient?.sendMessage(from, normalisedRecipient, body)
      })
      .then((messageId) => {
        return this.connection.query(
          `UPDATE whatsapp_ops SET status='SENDING', delivered_at=clock_timestamp(), message_id=:messageId, updated_at=clock_timestamp() WHERE id=:id;`,
          { replacements: { id, messageId }, type: QueryTypes.UPDATE }
        )
      })
      .catch((error: Error) => {
        return this.connection.query(
          `UPDATE whatsapp_ops SET status='ERROR', delivered_at=clock_timestamp(), error_code=:error, updated_at=clock_timestamp() WHERE id=:messageId;`,
          {
            replacements: { id, error: error.message.substring(0, 255) },
            type: QueryTypes.UPDATE,
          }
        )
      })
      .then(() => {
        logger.info({
          message: 'Sent whatsapp message',
          workerId: this.workerId,
          action: 'sendMessage',
        })
      })
  }

  async setSendingService(credentialName: string): Promise<void> {
    const credentials = await CredentialService.getWhatsappCredentials(
      credentialName
    )
    this.whatsappClient = new WhatsappClient(credentials)
  }

  destroySendingService(): void {
    this.whatsappClient = null
  }
}

export default Whatsapp
