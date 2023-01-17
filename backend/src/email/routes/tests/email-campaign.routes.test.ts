import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'
import initialiseServer from '@test-utils/server'
import config from '@core/config'
import { Campaign, User } from '@core/models'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { UploadService } from '@core/services'
import { EmailFromAddress, EmailMessage } from '@email/models'
import { CustomDomainService } from '@email/services'
import { ChannelType } from '@core/constants'
import { INVALID_FROM_ADDRESS_ERROR_MESSAGE } from '@email/middlewares'

const app = initialiseServer(true)
let sequelize: Sequelize
let campaignId: number
let protectedCampaignId: number

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
  const campaign = await Campaign.create({
    name: 'campaign-1',
    userId: 1,
    type: ChannelType.Email,
    valid: false,
    protect: false,
  } as Campaign)
  campaignId = campaign.id
  const protectedCampaign = await Campaign.create({
    name: 'campaign-2',
    userId: 1,
    type: ChannelType.Email,
    valid: false,
    protect: true,
  } as Campaign)
  protectedCampaignId = protectedCampaign.id
})

afterAll(async () => {
  await EmailMessage.destroy({ where: {} })
  await Campaign.destroy({ where: {}, force: true })
  await User.destroy({ where: {} })
  await sequelize.close()
  await UploadService.destroyUploadQueue()
  await (app as any).cleanup()
})

describe('PUT /campaign/{campaignId}/email/template', () => {
  afterEach(async () => {
    await EmailFromAddress.destroy({ where: {} })
  })

  test('Invalid from address is not accepted', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'abc@postman.gov.sg',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: INVALID_FROM_ADDRESS_ERROR_MESSAGE })
  })

  test('Invalid values for email is not accepted', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'not an email <not email>',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ message: '"from" must be a valid email' })
  })

  test('Default from address is used if not provided', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        template: expect.objectContaining({
          from: 'Postman <donotreply@mail.postman.gov.sg>',
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )
  })

  test('Unquoted from address with periods is accepted', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'Agency.gov.sg <donotreply@mail.postman.gov.sg>',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        template: expect.objectContaining({
          from: 'Agency.gov.sg via Postman <donotreply@mail.postman.gov.sg>',
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )
  })

  test('Default from address is accepted', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'Postman <donotreply@mail.postman.gov.sg>',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        template: expect.objectContaining({
          from: 'Postman <donotreply@mail.postman.gov.sg>',
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )
  })

  test("Unverified user's email as from address is not accepted", async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'user@agency.gov.sg',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'From Address has not been verified.' })
  })

  test("Verified user's email as from address is accepted", async () => {
    await EmailFromAddress.create({
      email: 'user@agency.gov.sg',
      name: 'Agency ABC',
    } as EmailFromAddress)
    const mockVerifyFromAddress = jest
      .spyOn(CustomDomainService, 'verifyFromAddress')
      .mockReturnValue(Promise.resolve())

    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'Agency ABC <user@agency.gov.sg>',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        template: expect.objectContaining({
          from: 'Agency ABC <user@agency.gov.sg>',
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )
    mockVerifyFromAddress.mockRestore()
  })

  test('Custom sender name with default from address should be accepted', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'Custom Name <donotreply@mail.postman.gov.sg>',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(200)
    const mailVia = config.get('mailVia')
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        template: expect.objectContaining({
          from: `Custom Name ${mailVia} <donotreply@mail.postman.gov.sg>`,
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )
  })

  test('Custom sender name with verified custom from address should be accepted', async () => {
    await EmailFromAddress.create({
      email: 'user@agency.gov.sg',
      name: 'Agency ABC',
    } as EmailFromAddress)
    const mockVerifyFromAddress = jest
      .spyOn(CustomDomainService, 'verifyFromAddress')
      .mockReturnValue(Promise.resolve())

    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'Custom Name <user@agency.gov.sg>',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })

    expect(res.status).toBe(200)
    const mailVia = config.get('mailVia')
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        template: expect.objectContaining({
          from: `Custom Name ${mailVia} <user@agency.gov.sg>`,
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )
    mockVerifyFromAddress.mockRestore()
  })

  test('Custom sender name with unverified from address should not be accepted', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: 'Custom Name <user@agency.gov.sg>',
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'From Address has not been verified.' })
  })

  test('Mail via should only be appended once', async () => {
    const mailVia = config.get('mailVia')
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        from: `Custom Name ${mailVia} <donotreply@mail.postman.gov.sg>`,
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${campaignId} updated`,
        template: expect.objectContaining({
          from: `Custom Name ${mailVia} <donotreply@mail.postman.gov.sg>`,
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )
  })

  test('Protected template without protectedlink variables is not accepted', async () => {
    const res = await request(app)
      .put(`/campaign/${protectedCampaignId}/email/template`)
      .send({
        subject: 'test',
        body: 'test',
        reply_to: 'user@agency.gov.sg',
      })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      message:
        'Error: There are missing keywords in the message template: protectedlink. Please return to the previous step to add in the keywords.',
    })
  })

  test('Protected template with disallowed variables in subject is not accepted', async () => {
    const testSubject = await request(app)
      .put(`/campaign/${protectedCampaignId}/email/template`)
      .send({
        subject: 'test {{name}}',
        body: '{{recipient}} {{protectedLink}}',
        reply_to: 'user@agency.gov.sg',
      })
    expect(testSubject.status).toBe(400)
    expect(testSubject.body).toEqual({
      message:
        'Error: Only these keywords are allowed in the template: protectedlink,recipient.\nRemove the other keywords from the template: name.',
    })
  })

  test('Protected template with disallowed variables in body is not accepted', async () => {
    const testBody = await request(app)
      .put(`/campaign/${protectedCampaignId}/email/template`)
      .send({
        subject: 'test',
        body: '{{recipient}} {{protectedLink}} {{name}}',
        reply_to: 'user@agency.gov.sg',
      })

    expect(testBody.status).toBe(400)
    expect(testBody.body).toEqual({
      message:
        'Error: Only these keywords are allowed in the template: protectedlink,recipient.\nRemove the other keywords from the template: name.',
    })
  })

  test('Protected template with only allowed variables is accepted', async () => {
    const testBody = await request(app)
      .put(`/campaign/${protectedCampaignId}/email/template`)
      .send({
        subject: 'test {{recipient}} {{protectedLink}}',
        body: 'test {{recipient}} {{protectedLink}}',
        reply_to: 'user@agency.gov.sg',
      })

    expect(testBody.status).toBe(200)
    expect(testBody.body).toEqual(
      expect.objectContaining({
        message: `Template for campaign ${protectedCampaignId} updated`,
        template: expect.objectContaining({
          from: 'Postman <donotreply@mail.postman.gov.sg>',
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )
  })

  test('Template with only invalid HTML tags is not accepted', async () => {
    const testBody = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        subject: 'test',
        body: '<script></script>',
        reply_to: 'user@agency.gov.sg',
      })

    expect(testBody.status).toBe(400)
    expect(testBody.body).toEqual({
      message:
        'Message template is invalid as it only contains invalid HTML tags!',
    })
  })

  test('Existing populated messages are removed when template has new variables', async () => {
    await EmailMessage.create({
      campaignId,
      recipient: 'user@agency.gov.sg',
      params: { recipient: 'user@agency.gov.sg' },
    } as EmailMessage)
    const testBody = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        subject: 'test',
        body: 'test {{name}}',
        reply_to: 'user@agency.gov.sg',
      })

    expect(testBody.status).toBe(200)
    expect(testBody.body).toEqual(
      expect.objectContaining({
        message:
          'Please re-upload your recipient list as template has changed.',
        template: expect.objectContaining({
          from: 'Postman <donotreply@mail.postman.gov.sg>',
          reply_to: 'user@agency.gov.sg',
        }),
      })
    )

    const emailMessages = await EmailMessage.count({
      where: { campaignId },
    })
    expect(emailMessages).toEqual(0)
  })

  test('Successfully update template', async () => {
    const res = await request(app)
      .put(`/campaign/${campaignId}/email/template`)
      .send({
        subject: 'test',
        body: 'test {{name}}',
        reply_to: 'user@agency.gov.sg',
      })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      message: `Template for campaign ${campaignId} updated`,
      template: {
        subject: 'test',
        body: 'test {{name}}',
        from: 'Postman <donotreply@mail.postman.gov.sg>',
        reply_to: 'user@agency.gov.sg',
        params: ['name'],
      },
    })
  })
})
