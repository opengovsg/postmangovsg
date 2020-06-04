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
    return this.client.sendMessage(telegramId, message).then((result) => {
      return result.message_id
    })
  }

  /**
   * Register a callback url for the bot.
   * @param callbackUrl
   */
  public registerCallbackUrl(callbackUrl: string): Promise<boolean> {
    return this.client.setWebhook(callbackUrl)
  }

  /**
   * Get info about bot
   */
  public getBotInfo(): Promise<string | number> {
    return this.client.getMe().then((user) => {
      const { is_bot: isBot, id } = user
      if (!isBot) {
        Promise.reject(new Error('User is not a bot.'))
      }

      return id
    })
  }
}
