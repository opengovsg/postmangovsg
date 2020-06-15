import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import { map } from 'lodash'

import TemplateClient from '@core/services/template-client.class'
import logger from '@core/logger'
import TelegramClient from '@telegram/services/telegram-client.class'
import { CredentialService } from '@core/services/credential.service'

const templateClient = new TemplateClient()

class Telegram {
  private workerId: string
  private connection: Sequelize
  private telegramClient: TelegramClient | null = null

  constructor(workerId: string, connection: Sequelize) {
    this.workerId = workerId
    this.connection = connection

    // TODO: remove
    logger.info(
      `telegram worker ${workerId}: connection=${this.connection.getDialect()} telegramClient=${
        this.telegramClient
      }`
    )
  }

  /**
   * Fetches bot token and instantiates a Telegram client.
   */
  async setSendingService(credentialName: string): Promise<void> {
    const botToken = await CredentialService.getTelegramCredentials(
      credentialName
    )
    this.telegramClient = new TelegramClient(botToken)
  }

  /**
   * Nullifies the Telegram client.
   */
  destroySendingService(): void {
    this.telegramClient = null
  }

  /**
   * Enqueues messages into `telegram_ops`.
   */
  async enqueueMessages(jobId: number): Promise<void> {
    await this.connection.query('SELECT enqueue_messages_telegram(:jobId)', {
      replacements: {
        jobId,
      },
    })
    logger.info(`${this.workerId}: s_enqueueMessagesTelegram job_id=${jobId}`)
  }

  /**
   * Extract messages from `telegram_ops` based on a given `rate`.
   */
  async getMessages(
    jobId: number,
    rate: number
  ): Promise<
    Array<{
      id: number
      recipient: string
      params: { [key: string]: string }
      body: string
      campaignId: number
    }>
  > {
    const result = await this.connection.query(
      'SELECT get_messages_to_send_telegram(:jobId, :rate)',
      {
        replacements: {
          jobId,
          rate,
        },
        type: QueryTypes.SELECT,
      }
    )
    const messages = map(result, 'get_messages_to_send_telegram')
    return messages
  }

  /**
   * Templates and sends a message through the Telegram client.
   */
  async sendMessage({
    id,
    recipient,
    params,
    body,
  }: {
    id: number
    recipient: string
    params: { [key: string]: string }
    body: string
  }): Promise<void> {
    try {
      const message = templateClient.template(body, params)
      const messageId = await this.telegramClient?.send(recipient, message)

      // Update `telegram_ops` with Telegram message id
      await this.connection.query(
        `
          UPDATE telegram_ops
          SET message_id = :messageId, delivered_at = clock_timestamp(), updated_at = clock_timestamp()
          WHERE id = :id
        `,
        {
          replacements: {
            messageId,
            id,
          },
        }
      )
    } catch (err) {
      // Sending failure, update `telegram_ops` with error code
      const error = `${err.code}: ${err.description}`
      await this.connection.query(
        `
          UPDATE telegram_ops
          SET error_code = :error, updated_at = clock_timestamp()
          WHERE id = :id
        `,
        {
          replacements: {
            error,
            id,
          },
        }
      )
    }

    logger.info(`${this.workerId}: sendMessageTelegram id=${id}`)
  }
}

export default Telegram
