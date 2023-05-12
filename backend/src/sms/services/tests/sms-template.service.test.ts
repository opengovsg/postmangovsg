import { Sequelize } from 'sequelize-typescript'
import sequelizeLoader from '@test-utils/sequelize-loader'

import S3Client from '@core/services/s3-client.class'
import { ChannelType } from '@core/constants'
import { Campaign, User } from '@core/models'
import { UploadService } from '@core/services'

import { SmsTemplate, SmsMessage } from '@sms/models'
import { SmsTemplateService } from '@sms/services'

import { createDownloadStream } from '@test-utils/create-download-stream'

let sequelize: Sequelize
let campaign: Campaign

jest.mock('aws-sdk/client-s3')
jest.mock('@core/services/s3-client.class')

const MockS3Client = S3Client as jest.MockedClass<typeof S3Client>

function setupMockRecipientList(headers: string[], data: string[][]): void {
  const file = createDownloadStream(headers, data)
  MockS3Client.mockImplementationOnce(() => ({
    ...jest.requireActual('@core/services/s3-client.class'),
    download: jest.fn().mockReturnValue(file),
  }))
}

beforeEach(() => {
  MockS3Client.mockClear()
})

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
})

afterAll(async () => {
  await SmsMessage.destroy({ where: {} })
  await SmsTemplate.destroy({ where: {} })
  await Campaign.destroy({ where: {}, force: true })
  await User.destroy({ where: {} })
  await sequelize.close()

  await UploadService.destroyUploadQueue()

  await new Promise((resolve) => setImmediate(resolve))
})

describe('processUpload', () => {
  beforeEach(async () => {
    campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.SMS,
      valid: false,
      protect: false,
    } as Campaign)
  })

  test('Successfully process a valid CSV file', async () => {
    setupMockRecipientList(['recipient', 'name'], [['+6591234567', 'Test']])

    const { id: campaignId } = campaign
    const template = await SmsTemplate.create({
      campaignId,
      params: ['name'],
      body: '{{name}}',
    } as SmsTemplate)

    await expect(
      SmsTemplateService.processUpload({
        campaignId,
        template,
        s3Key: 's3Key',
        etag: 'etag',
        filename: 'sms.csv',
      })
    ).resolves.not.toThrow()

    const updated = await Campaign.findOne({ where: { id: campaignId } })
    expect(updated?.s3Object?.filename).not.toBeUndefined()

    const messages = await SmsMessage.findAll({ where: { campaignId } })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      campaignId,
      recipient: '+6591234567',
      params: { name: 'Test', recipient: '+6591234567' },
    })
  })

  test('Throw an error for an invalid CSV file with missing variables', async () => {
    setupMockRecipientList(['recipient', 'name'], [['+6591234567', 'Test']])

    const { id: campaignId } = campaign
    const template = await SmsTemplate.create({
      campaignId,
      params: ['missing'],
      body: '{{missing}}',
    } as SmsTemplate)

    await expect(
      SmsTemplateService.processUpload({
        campaignId,
        template,
        s3Key: 's3Key',
        etag: 'etag',
        filename: 'sms.csv',
      })
    ).rejects.toThrow()

    const updated = await Campaign.findOne({ where: { id: campaignId } })
    expect(updated?.s3Object).toBeNull()

    const messages = await SmsMessage.findAll({ where: { campaignId } })
    expect(messages).toHaveLength(0)
  })
})
