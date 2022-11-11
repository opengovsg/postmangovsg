import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'

import { User, Credential, UserCredential } from '@shared/core/models'
import { ChannelType } from '@shared/core/constants'
import { RateLimitError, InvalidRecipientError } from '@core/errors'
import { TemplateError } from '@shared/templating'
import { SmsService } from '@sms/services'

import { mockSecretsManager } from '@mocks/aws-sdk'
import initialiseServer from '@test-utils/server'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { ApiKeyService } from '@core/services'

const TEST_TWILIO_CREDENTIALS = {
  accountSid: '',
  apiKey: '',
  apiSecret: '',
  messagingServiceSid: '',
}

let sequelize: Sequelize
let user: User
let userId = 1
let apiKey: string
let credential: Credential
let userCredential: UserCredential

const app = initialiseServer(false)

beforeEach(async () => {
  user = await User.create({
    id: userId,
    email: `user_${userId}@agency.gov.sg`,
  } as User)
  apiKey = await ApiKeyService.regenerateAndSaveApiKey(user)
  userCredential = await UserCredential.create({
    label: `twilio-${userId}`,
    type: ChannelType.SMS,
    credName: credential.name,
    userId,
  } as UserCredential)
  userId += 1
})

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  credential = await Credential.create({ name: 'twilio' } as Credential)
})

afterEach(() => jest.clearAllMocks())

afterAll(async () => {
  await Credential.destroy({ where: {} })
  await UserCredential.destroy({ where: {} })
  await User.destroy({ where: {} })
  await sequelize.close()
  await (app as any).cleanup()
})

describe('POST /transactional/sms/send', () => {
  test('Should throw an error if API key is invalid', async () => {
    const res = await request(app)
      .post('/transactional/sms/send')
      .set('Authorization', `Bearer invalid-${apiKey}`)
      .send({})

    expect(res.status).toBe(401)
  })

  test('Should throw an error if API key is valid but payload is not', async () => {
    const res = await request(app)
      .post('/transactional/sms/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({})

    expect(res.status).toBe(400)
  })

  test('Should send a message successfully', async () => {
    const mockSendMessage = jest
      .spyOn(SmsService, 'sendMessage')
      .mockResolvedValue('message_id')
    mockSecretsManager.getSecretValue().promise.mockResolvedValueOnce({
      SecretString: JSON.stringify(TEST_TWILIO_CREDENTIALS),
    })

    const res = await request(app)
      .post('/transactional/sms/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        recipient: '91234567',
        body: 'body',
        label: userCredential.label,
      })

    expect(res.status).toBe(202)
    expect(mockSendMessage).toBeCalledTimes(1)
    mockSendMessage.mockReset()
  })

  test('Should return a HTTP 400 when template is invalid', async () => {
    const mockSendMessage = jest
      .spyOn(SmsService, 'sendMessage')
      .mockRejectedValueOnce(new TemplateError('Invalid template'))
    mockSecretsManager.getSecretValue().promise.mockResolvedValueOnce({
      SecretString: JSON.stringify(TEST_TWILIO_CREDENTIALS),
    })

    const res = await request(app)
      .post('/transactional/sms/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        recipient: '91234567',
        body: 'body',
        label: userCredential.label,
      })

    expect(res.status).toBe(400)
    expect(mockSendMessage).toBeCalledTimes(1)
    mockSendMessage.mockReset()
  })

  test('Should return a HTTP 400 when recipient is not valid', async () => {
    const mockSendMessage = jest
      .spyOn(SmsService, 'sendMessage')
      .mockRejectedValueOnce(new InvalidRecipientError())
    mockSecretsManager.getSecretValue().promise.mockResolvedValueOnce({
      SecretString: JSON.stringify(TEST_TWILIO_CREDENTIALS),
    })

    const res = await request(app)
      .post('/transactional/sms/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        recipient: '91234567',
        body: 'body',
        label: userCredential.label,
      })

    expect(res.status).toBe(400)
    expect(mockSendMessage).toBeCalledTimes(1)
    mockSendMessage.mockReset()
  })

  test('Should return a HTTP 429 when Twilio rate limits request', async () => {
    const mockSendMessage = jest
      .spyOn(SmsService, 'sendMessage')
      .mockRejectedValueOnce(new RateLimitError())
    mockSecretsManager.getSecretValue().promise.mockResolvedValueOnce({
      SecretString: JSON.stringify(TEST_TWILIO_CREDENTIALS),
    })

    const res = await request(app)
      .post('/transactional/sms/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        recipient: '91234567',
        body: 'body',
        label: userCredential.label,
      })

    expect(res.status).toBe(429)
    expect(mockSendMessage).toBeCalledTimes(1)
    mockSendMessage.mockReset()
  })
})
