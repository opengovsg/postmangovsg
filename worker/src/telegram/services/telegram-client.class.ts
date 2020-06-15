import { Telegram } from 'telegraf'

export default class TelegramClient {
  private client: Telegram
  constructor(botToken: string) {
    this.client = new Telegram(botToken)
  }

  async send(recipient: string, message: string): Promise<number> {
    const response = await this.client.sendMessage(recipient, message)
    return response.message_id
  }
}
