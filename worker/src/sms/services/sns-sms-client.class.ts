import { SNSClient, PublishCommand, PublishInput } from '@aws-sdk/client-sns'
import config from '@core/config'

const region = config.get('aws.awsRegion')

export default class SnsSmsClient {
  private client: SNSClient
  private senderId: string

  constructor(senderId = 'postman') {
    this.client = new SNSClient({ region })
    this.senderId = senderId
  }

  async send(
    _messageId: number,
    recipient: string,
    message: string,
    _campaignId?: number
  ): Promise<string | void> {
    const params: PublishInput = {
      Message: this.replaceNewLines(message),
      PhoneNumber: recipient,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: this.senderId,
        },
      },
    }
    const data = await this.client.send(new PublishCommand(params))
    return data.MessageId
  }

  private replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n')
  }
}
