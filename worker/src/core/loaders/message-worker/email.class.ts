import { Sequelize } from 'sequelize-typescript'
import { QueryTypes, Transaction } from 'sequelize'
import map from 'lodash/map'

import logger from '@core/logger'
import config from '@core/config'
import MailClient from '@email/services/mail-client.class'
import { TemplateClient } from 'postman-templating'

const templateClient = new TemplateClient(config.get('xssOptions.email'))
class Email {
  private workerId: string
  private connection: Sequelize
  private mailService: MailClient
  constructor(workerId: string, connection: Sequelize) {
    this.workerId = workerId
    this.connection = connection
    this.mailService = new MailClient(
      config.get('mailFrom'),
      config.get('mailOptions')
    )
  }

  enqueueMessages(jobId: number, campaignId: number): Promise<void> {
    return this.connection
      .transaction(async (transaction: Transaction) => {
        await this.connection.query('SELECT enqueue_messages_email(:job_id);', {
          replacements: { job_id: jobId },
          type: QueryTypes.SELECT,
          transaction,
        })
        // This is to ensure that stats count tally with total count during sending
        // as enqueue step may set messages as invalid
        await this.connection.query(
          'SELECT update_stats_email(:campaign_id);',
          {
            replacements: { campaign_id: campaignId },
            type: QueryTypes.SELECT,
            transaction,
          }
        )
      })
      .then(() => {
        logger.info(`${this.workerId}: s_enqueueMessagesEmail job_id=${jobId}`)
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
      subject: string
      replyTo: string | null
    }[]
  > {
    return this.connection
      .query('SELECT get_messages_to_send_email(:job_id, :rate);', {
        replacements: { job_id: jobId, rate },
        type: QueryTypes.SELECT,
      })
      .then((result) => map(result, 'get_messages_to_send_email'))
  }

  sendMessage({
    id,
    recipient,
    params,
    body,
    subject,
    replyTo,
  }: {
    id: number
    recipient: string
    params: { [key: string]: string }
    body: string
    subject?: string
    replyTo?: string | null
  }): Promise<void> {
    return Promise.resolve()
      .then(() => {
        return {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          subject: templateClient.template(subject!, params),
          hydratedBody: templateClient.template(body, params),
        }
      })
      .then(
        ({
          subject,
          hydratedBody,
        }: {
          subject: string
          hydratedBody: string
        }) => {
          return this.mailService.sendMail({
            recipients: [recipient],
            subject,
            body: hydratedBody,
            referenceId: String(id),
            ...(replyTo ? { replyTo } : {}),
          })
        }
      )
      .then((messageId) => {
        return this.connection.query(
          `UPDATE email_ops SET status='SENDING', delivered_at=clock_timestamp(), message_id=:messageId, updated_at=clock_timestamp() WHERE id=:id;`,
          { replacements: { id, messageId }, type: QueryTypes.UPDATE }
        )
      })
      .catch((error: Error) => {
        return this.connection.query(
          `UPDATE email_ops SET status='ERROR', delivered_at=clock_timestamp(), error_code=:error, updated_at=clock_timestamp() WHERE id=:id;`,
          {
            replacements: { id, error: error.message.substring(0, 255) },
            type: QueryTypes.UPDATE,
          }
        )
      })
      .then(() => {
        logger.info(`${this.workerId}: sendMessage id=${id}`)
      })
  }

  async setSendingService(_: string): Promise<void> {
    // Do nothing
    return
  }

  destroySendingService(): void {
    // Do nothing
    return
  }
}

export default Email
