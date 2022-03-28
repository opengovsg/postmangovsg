import { Sequelize } from 'sequelize-typescript'
import sequelizeLoader from '@test-utils/sequelize-loader'

import S3Client from '@core/services/s3-client.class'
import { ChannelType } from '@core/constants'
import { Campaign, User, ProtectedMessage } from '@core/models'
import { UploadService } from '@core/services'

import { EmailTemplate, EmailMessage } from '@email/models'
import { EmailTemplateService } from '@email/services'

import { createDownloadStream } from '@test-utils/create-download-stream'

let sequelize: Sequelize
let campaign: Campaign

jest.mock('aws-sdk/clients/s3')
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
  await Campaign.destroy({ where: {}, force: true })
})

afterAll(async () => {
  await EmailTemplate.destroy({ where: {} })
  await EmailMessage.destroy({ where: {} })
  await ProtectedMessage.destroy({ where: {} })
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
      type: ChannelType.Email,
      valid: false,
      protect: false,
    } as Campaign)
  })

  test('Successfully process a valid CSV file', async () => {
    setupMockRecipientList(
      ['recipient', 'name'],
      [['test@open.gov.sg', 'Test']]
    )

    const { id: campaignId } = campaign
    const template = await EmailTemplate.create({
      campaignId,
      params: ['name'],
      subject: 'subject',
      body: '{{name}}',
    } as EmailTemplate)

    await expect(
      EmailTemplateService.processUpload({
        campaignId,
        template,
        s3Key: 's3Key',
        etag: 'etag',
        filename: 'email.csv',
      })
    ).resolves.not.toThrow()

    const updated = await Campaign.findOne({ where: { id: campaignId } })
    expect(updated?.s3Object?.filename).not.toBeUndefined()

    const messages = await EmailMessage.findAll({ where: { campaignId } })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      campaignId,
      recipient: 'test@open.gov.sg',
      params: { name: 'Test', recipient: 'test@open.gov.sg' },
    })
  })

  test('Throw an error for an invalid CSV file with missing variables', async () => {
    const filename = 'email.csv'
    setupMockRecipientList(['recipient'], [['test@open.gov.sg']])

    const { id: campaignId } = campaign
    const template = await EmailTemplate.create({
      campaignId,
      params: ['recipient', 'missing'],
      subject: 'subject',
      body: '{{missing}}',
    } as EmailTemplate)

    await expect(
      EmailTemplateService.processUpload({
        campaignId,
        template,
        s3Key: 's3Key',
        etag: 'etag',
        filename,
      })
    ).rejects.toThrow()

    const updated = await Campaign.findOne({ where: { id: campaignId } })
    expect(updated?.s3Object).toBeNull()

    const messages = await EmailMessage.findAll({ where: { campaignId } })
    expect(messages).toHaveLength(0)
  })
})

describe('processProtectedUpload', () => {
  beforeEach(async () => {
    campaign = await Campaign.create({
      name: 'campaign-1',
      userId: 1,
      type: ChannelType.Email,
      valid: false,
      protect: true,
    } as Campaign)
  })

  test('Successfully process a valid CSV file', async () => {
    setupMockRecipientList(
      ['recipient', 'payload', 'passwordHash', 'id'],
      [['test@open.gov.sg', 'payload', 'passwordHash', 'id']]
    )

    const { id: campaignId } = campaign
    const template = await EmailTemplate.create({
      campaignId,
      params: ['recipient', 'protectedlink'],
      subject: 'subject',
      body: '{{protectedlink}}',
    } as EmailTemplate)

    await expect(
      EmailTemplateService.processProtectedUpload({
        campaignId,
        template,
        s3Key: 's3Key',
        etag: 'etag',
        filename: 'protected.csv',
      })
    ).resolves.not.toThrow()

    const updated = await Campaign.findOne({ where: { id: campaignId } })
    expect(updated?.s3Object?.filename).not.toBeUndefined()

    const messages = await EmailMessage.findAll({ where: { campaignId } })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      campaignId,
      recipient: 'test@open.gov.sg',
      params: { recipient: 'test@open.gov.sg' },
    })

    const protectedMessages = await ProtectedMessage.findAll({
      where: { campaignId },
    })
    expect(protectedMessages).toHaveLength(1)
    expect(protectedMessages[0]).toMatchObject({
      id: 'id',
      payload: 'payload',
      passwordHash: 'passwordHash',
    })
  })
})
