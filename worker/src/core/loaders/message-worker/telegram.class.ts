import { Sequelize } from 'sequelize-typescript'

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
    // TODO: Write and call db function to enqueue messages into ops table
    // For those with no phone number -> chat id mapping, set error code
    logger.info(`${this.workerId}: s_enqueueMessagesTelegram job_id=${jobId}`)
    return
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
    // TODO: remove
    logger.info(
      `${this.workerId}: s_getMessagesTelegram job_id=${jobId} rate=${rate}`
    )

    // TODO: Write and call db function to extract messages from ops table
    // Return messages
    return []
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
      // TODO: remove
      logger.info(
        `${
          this.workerId
        }: s_sendMessageTelegram id=${id} recipient=${recipient} message=${templateClient.template(
          body,
          params
        )}`
      )

      // TODO: Use Telegram client to send message
    } catch (err) {
      // Set error code
    }
  }
}

export default Telegram
