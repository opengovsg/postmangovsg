import {
  SNSClient,
  PublishCommand,
  PublishInput,
  MessageAttributeValue,
} from '@aws-sdk/client-sns'
import config from '@core/config'

const region = config.get('aws.awsRegion')

export default class SnsSmsClient {
  private client: SNSClient
  private messageAttrs: { [key: string]: MessageAttributeValue }

  constructor(senderId = 'postman') {
    this.client = new SNSClient({ region })
    this.messageAttrs = {
      'AWS.SNS.SMS.SenderID': {
        DataType: 'String',
        StringValue: senderId,
      },
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional',
      },
    }
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
      MessageAttributes: this.messageAttrs,
    }
    const data = await this.client.send(new PublishCommand(params))
    return data.MessageId
  }

  private replaceNewLines(body: string): string {
    return (body || '').replace(/<br\s*\/?>/g, '\n')
  }
}
