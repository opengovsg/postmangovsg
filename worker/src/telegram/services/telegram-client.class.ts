import { Telegram } from 'telegraf'

export default class TelegramClient {
  private client: Telegram
  constructor() {
    this.client = new Telegram('token')
  }

  public send(
    recipient: string,
    message: string
  ): Promise<string | number | void> {
    return this.client
      .sendMessage(recipient, message)
      .then((result) => {
        // TODO: implement
        return result.message_id
      })
      .catch((error) => {
        return Promise.reject(new Error(error.messsage))
      })
  }
}
