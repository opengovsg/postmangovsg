import { SNSClient, PublishCommand, PublishInput } from '@aws-sdk/client-sns'
import config from '@core/config'

const region = config.get('aws.awsRegion')

export default class SnsSmsClient {
  private client: SNSClient

  constructor() {
    this.client = new SNSClient({ region })
  }

  async send(recipient: string, message: string): Promise<string | void> {
    const params: PublishInput = {
      Message: this.replaceNewLines(message),
      PhoneNumber: recipient,
    }
    const data = await this.client.send(new PublishCommand(params))
    return data.MessageId
  }

  private replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n')
  }
}
