import { Telegram } from 'telegraf'
import config from '@core/config'

export default class TelegramClient {
  private client: Telegram
  constructor(botToken: string) {
    this.client = new Telegram(botToken, {
      apiRoot: config.get('telegramOptions.apiRoot'),
    })
  }

  async send(recipient: string, message: string): Promise<number> {
    const response = await this.client.sendMessage(recipient, message, {
      parse_mode: 'HTML',
    })
    return response.message_id
  }
}
