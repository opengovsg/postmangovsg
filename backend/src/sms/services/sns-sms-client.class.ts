import {
  MessageAttributeValue,
  PublishCommand,
  PublishInput,
  SNSClient,
} from '@aws-sdk/client-sns'
import config from '@core/config'

const region = config.get('aws.awsRegion')
const DEFAULT_SENDER_ID = config.get('smsFallback.senderId')

export default class SnsSmsClient {
  private client: SNSClient
  private messageAttrs: { [key: string]: MessageAttributeValue }

  constructor(senderId = DEFAULT_SENDER_ID) {
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

  async send(recipient: string, message: string): Promise<string | void> {
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
