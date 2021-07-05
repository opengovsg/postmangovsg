import { Telegram } from 'telegraf'

export default class TelegramClient {
  private client: Telegram

  constructor(botToken: string) {
    this.client = new Telegram(botToken)
  }

  /**
   * Send a message to a telegram recipient
   * @param telegramId
   * @param message
   */
  public send(telegramId: string | number, message: string): Promise<number> {
    return this.client
      .sendMessage(telegramId, message, { parse_mode: 'HTML' })
      .then((result) => {
        return result.message_id
      })
  }

  /**
   * Register a callback url for the bot.
   * @param callbackUrl
   */
  public registerCallbackUrl(callbackUrl: string): Promise<void> {
    return this.client.setWebhook(callbackUrl).then((success: boolean) => {
      if (!success) throw new Error('Failed to register callback')
    })
  }

  /**
   * Add a command on the bot.
   * @param commands
   */
  public setCommands(
    commands: Array<{
      command: string
      description: string
    }>
  ): Promise<void> {
    return this.client.setMyCommands(commands).then((success: boolean) => {
      if (!success) throw new Error('Failed to register commands')
    })
  }

  /**
   * Get info about bot
   * @throws Will throw an error if the botToken is invalid.
   */
  public getBotInfo(): Promise<string | number> {
    return this.client.getMe().then((user) => {
      return user.id
    })
  }
}
