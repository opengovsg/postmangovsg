import { Sequelize } from 'sequelize-typescript'
import { QueryTypes, Transaction } from 'sequelize'
import map from 'lodash/map'
import crypto from 'crypto'
import validator from 'validator'

import { loggerWithLabel } from '@core/logger'
import config from '@core/config'
import MailClient from '@email/services/mail-client.class'
import { TemplateClient, XSS_EMAIL_OPTION } from '@shared/templating'
import { generateThemedHTMLEmail } from '@shared/theme'
import { Message } from './interface'

const templateClient = new TemplateClient({ xssOptions: XSS_EMAIL_OPTION })
const logger = loggerWithLabel(module)

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

  async getMessages(jobId: number, rate: number): Promise<Message[]> {
    type GetMessagesResult = {
      get_messages_to_send_email: Message
    }

    const result: GetMessagesResult[] = await this.connection.query(
      'SELECT get_messages_to_send_email(:job_id, :rate);',
      {
        replacements: { job_id: jobId, rate },
        type: QueryTypes.SELECT,
      }
    )

    if (result.length === 0) return []

    // Extract agency name and logo (if exists) based on replyTo email
    const replyTo = result[0]['get_messages_to_send_email'].replyTo
    const domain = replyTo?.substring(replyTo.lastIndexOf('@') + 1)

    const agency = (await this.connection.query(
      'SELECT name, logo_uri FROM agencies WHERE domain=:domain',
      {
        replacements: { domain },
        plain: true,
      }
    )) as {
      name?: string
      logo_uri?: string
    }

    // Inject agency name and logo (if exists) into messages array
    const messages = map(result, (r: GetMessagesResult) => ({
      ...r['get_messages_to_send_email'], // message object from SQL query
      agencyName: agency.name || replyTo || undefined,
      agencyLogoURI: agency.logo_uri,
    }))
    return messages
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
    const link = new URL(
      `/unsubscribe/${version}`,
      config.get('unsubscribeUrl')
    )
    link.searchParams.append('c', campaignId.toString())
    link.searchParams.append('r', recipient)
    link.searchParams.append('h', hmac)
    return link
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
    agencyName,
    agencyLogoURI,
  }: Message): Promise<void> {
    return new Promise<void>((resolve, reject) => {
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
          const unsubLink = this.generateUnsubLink(
            campaignId!,
            recipient
          ).toString()
          const themedHTMLEmail = generateThemedHTMLEmail({
            body: hydratedBody,
            unsubLink,
            agencyName,
            agencyLogoURI,
          })
          return this.mailService.sendMail({
            from: from || config.get('mailFrom'),
            recipients: [recipient],
            subject,
            body: themedHTMLEmail,
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
