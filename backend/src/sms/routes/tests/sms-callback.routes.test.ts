import { Sequelize } from 'sequelize-typescript'
import { Credential, User, UserCredential } from '@core/models'
import initialiseServer from '@test-utils/server'
import { ChannelType } from '@core/constants'
import sequelizeLoader from '@test-utils/sequelize-loader'
import {
  SmsMessageTransactional,
  TransactionalSmsMessageStatus,
} from '@sms/models'
import request from 'supertest'
import { SmsCallbackService, SmsService } from '@sms/services'
import { mockSecretsManager } from '@mocks/aws-sdk'

const TEST_TWILIO_CREDENTIALS = {
  accountSid: '',
  apiKey: '',
  apiSecret: '',
  messagingServiceSid: '',
}

let sequelize: Sequelize
let user: User
let apiKey: string
let credential: Credential

const app = initialiseServer(false)

beforeEach(async () => {
  user = await User.create({
    email: 'sms_callback@agency.gov.sg',
  } as User)
  const userId = user.id
  apiKey = await user.regenerateAndSaveApiKey()
  await UserCredential.create({
    label: `twilio-callback-${userId}`,
    type: ChannelType.SMS,
    credName: credential.name,
    userId,
  } as UserCredential)
})

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  credential = await Credential.create({ name: 'twilio' } as Credential)
})

afterEach(async () => {
  jest.clearAllMocks()
  await SmsMessageTransactional.destroy({ where: {} })
  await User.destroy({ where: {} })
  await UserCredential.destroy({ where: {} })
})

afterAll(async () => {
  await sequelize.close()
  await (app as any).cleanup()
})

describe('On successful message send, status should update according to Twilio response', () => {
  const validApiCall = {
    body: 'Hello world',
    recipient: '98765432',
    label: 'twilio-callback-1',
  }
  test('Should send a message successfully', async () => {
    const mockSendMessageResolvedValue = 'message_id'
    const mockSendMessage = jest
      .spyOn(SmsService, 'sendMessage')
      .mockResolvedValue(mockSendMessageResolvedValue)
    mockSecretsManager.getSecretValue().promise.mockResolvedValueOnce({
      SecretString: JSON.stringify(TEST_TWILIO_CREDENTIALS),
    })
    const res = await request(app)
      .post('/transactional/sms/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(validApiCall)

    expect(res.status).toBe(201)
    expect(mockSendMessage).toBeCalledTimes(1)

    const transactionalSms = await SmsMessageTransactional.findOne({
      where: { userId: user.id.toString() },
      order: [['createdAt', 'DESC']],
    })
    const transactionalSmsId = transactionalSms?.id

    const getByIdRes = await request(app)
      .get(`/transactional/sms/${transactionalSmsId}`)
      .set('Authorization', `Bearer ${apiKey}`)
      .send()
    expect(getByIdRes.status).toBe(200)
    expect(getByIdRes.body.status).toBe(TransactionalSmsMessageStatus.Unsent)
    expect(getByIdRes.body.body).toEqual('Hello world')
    expect(getByIdRes.body.recipient).toEqual('98765432')
    expect(getByIdRes.body.credentialsLabel).toEqual('twilio-callback-1')

    expect(getByIdRes.status).toBe(200)
    expect(getByIdRes.body.status).toBe(TransactionalSmsMessageStatus.Unsent)
    const sampleTwilioCallback = {
      SmsSid: mockSendMessageResolvedValue,
      SmsStatus: 'sent',
      MessageStatus: 'sent',
      To: '+1512zzzyyyy',
      MessageSid: mockSendMessageResolvedValue,
      AccountSid: 'ACxxxxxxx',
      From: '+1512xxxyyyy',
      ApiVersion: '2010-04-01',
      ErrorCode: 'ERRORBOI',
    }
    sampleTwilioCallback.ErrorCode = ''

    jest
      .spyOn(SmsCallbackService, 'isAuthenticatedTransactional')
      .mockReturnValue(true)
    let callbackRes = await request(app)
      .post('/callback/sms')
      .set('Authorization', `Basic ${1234}`)
      .send(sampleTwilioCallback)

    expect(callbackRes.status).toBe(200)
    const postCallbackGetByIdRes = await request(app)
      .get('/transactional/sms/1')
      .set('Authorization', `Bearer ${apiKey}`)
      .send()
    expect(postCallbackGetByIdRes.status).toBe(200)
    expect(postCallbackGetByIdRes.body.status).toBe(
      TransactionalSmsMessageStatus.Sent
    )

    sampleTwilioCallback.MessageStatus = 'failed'
    sampleTwilioCallback.ErrorCode = 'ERRORBOI'
    callbackRes = await request(app)
      .post('/callback/sms')
      .set('Authorization', `Basic ${1234}`)
      .send(sampleTwilioCallback)

    expect(callbackRes.status).toBe(200)

    const errorCallbackGetByIdRes = await request(app)
      .get('/transactional/sms/1')
      .set('Authorization', `Bearer ${apiKey}`)
      .send()
    expect(errorCallbackGetByIdRes.status).toBe(200)
    expect(errorCallbackGetByIdRes.body.status).toBe(
      TransactionalSmsMessageStatus.Error
    )

    sampleTwilioCallback.MessageStatus = 'delivered'
    sampleTwilioCallback.ErrorCode = ''
    callbackRes = await request(app)
      .post('/callback/sms')
      .set('Authorization', `Basic ${1234}`)
      .send(sampleTwilioCallback)

    expect(callbackRes.status).toBe(200)

    const finalCallbackGetByIdRes = await request(app)
      .get('/transactional/sms/1')
      .set('Authorization', `Bearer ${apiKey}`)
      .send()
    expect(finalCallbackGetByIdRes.status).toBe(200)
    expect(finalCallbackGetByIdRes.body.status).toBe(
      TransactionalSmsMessageStatus.Error
    )
  })
})
