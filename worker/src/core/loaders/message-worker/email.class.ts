import { Sequelize } from 'sequelize-typescript'
import { QueryTypes, Transaction } from 'sequelize'
import map from 'lodash/map'
import crypto from 'crypto'
import validator from 'validator'

import { loggerWithLabel } from '@core/logger'
import config from '@core/config'
import MailClient from '@email/services/mail-client.class'
import { TemplateClient, XSS_EMAIL_OPTION } from 'postman-templating'

const logger = loggerWithLabel(module)
const templateClient = new TemplateClient(XSS_EMAIL_OPTION)
class Email {
  private workerId: string
  private connection: Sequelize
  private mailService: MailClient
  constructor(workerId: string, connection: Sequelize) {
    this.workerId = workerId
    this.connection = connection
    this.mailService = new MailClient(config.get('mailOptions'))
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
        logger.info({
          message: 'Enqueued email messages',
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
      subject: string
      replyTo: string | null
      from: string
      campaignId: number
    }[]
  > {
    return this.connection
      .query('SELECT get_messages_to_send_email(:job_id, :rate);', {
        replacements: { job_id: jobId, rate },
        type: QueryTypes.SELECT,
      })
      .then((result) => map(result, 'get_messages_to_send_email'))
  }

  calculateHash(campaignId: number, recipient: string): string {
    const version = config.get('unsubscribeHmac.version')
    return crypto
      .createHmac(
        config.get(`unsubscribeHmac.${version}.algo`),
        config.get(`unsubscribeHmac.${version}.key`)
      )
      .update(`${campaignId}.${recipient}`)
      .digest('hex')
  }

  generateUnsubLink(campaignId: number, recipient: string): URL {
    const version = config.get('unsubscribeHmac.version')
    const hmac = this.calculateHash(campaignId, recipient)
    const link = new URL(`/unsubscribe/${version}`, config.get('frontendUrl'))
    link.searchParams.append('c', campaignId.toString())
    link.searchParams.append('r', recipient)
    link.searchParams.append('h', hmac)
    return link
  }

  appendUnsubToMessage(msg: string, unsubUrl: string): string {
    const colors = {
      text: '#697783',
      link: '#2C2CDC',
    }

    return `${msg} <br><hr> 
    <p style="font-size:12px;color:${colors.text};line-height:2em">\
      <a href="https://postman.gov.sg" style="color:${colors.link}" target="_blank">Postman.gov.sg</a>
      is a mass messaging platform used by the Singapore Government to communicate with stakeholders.
      For more information, please visit our <a href="https://guide.postman.gov.sg/faqs/faq-recipients" style="color:${colors.link}" target="_blank">site</a>. 
    </p>
    <p style="font-size:12px;color:${colors.text};line-height:2em">
      If you wish to unsubscribe from similar emails from your sender, please click <a href="${unsubUrl}" style="color:${colors.link}" target="_blank">here</a>
      to unsubscribe and we will inform the respective agency.
    </p>
    `
  }

  async sendMessage({
    id,
    recipient,
    params,
    body,
    subject,
    replyTo,
    from,
    campaignId,
  }: {
    id: number
    recipient: string
    params: { [key: string]: string }
    body: string
    subject?: string
    replyTo?: string | null
    from?: string
    campaignId?: number
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!validator.isEmail(recipient)) {
        return reject(new Error('Recipient is incorrectly formatted'))
      }
      return resolve()
    })
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
          const unsubUrl = this.generateUnsubLink(
            campaignId!,
            recipient
          ).toString()
          const bodyWithUnsub = this.appendUnsubToMessage(
            hydratedBody,
            unsubUrl
          )
          return this.mailService.sendMail({
            from: from || config.get('mailFrom'),
            recipients: [recipient],
            subject,
            body: bodyWithUnsub,
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
        logger.info({
          message: 'Sent email message',
          workerId: this.workerId,
          id,
          action: 'sendMessage',
        })
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
