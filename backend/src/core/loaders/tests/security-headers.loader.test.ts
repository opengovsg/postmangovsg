import request from 'supertest'
import express from 'express'
import { Readable } from 'stream'
import { Sequelize } from 'sequelize-typescript'
import { S3 } from '@aws-sdk/client-s3'
import initialiseServer from '@test-utils/server'
import sequelizeLoader from '@test-utils/sequelize-loader'
import securityHeadersLoader from '@core/loaders/security-headers.loader'
import { User } from '@core/models'
import { CommonAttachment } from '@email/models/common-attachment'

jest.mock('@aws-sdk/client-s3')

const server = initialiseServer(false)
const app = express()
securityHeadersLoader({ app })
app.use(server)
let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
  jest.mocked(S3.prototype.getObject).mockImplementation(async () => ({
    Body: Readable.from([Buffer.from('file contents')]),
  }))
})

afterAll(async () => {
  await CommonAttachment.destroy({ where: {}, force: true })
  await User.destroy({ where: {} })
  await sequelize.close()
  await (server as any).cleanup()
})

describe('Cross-origin headers', () => {
  test('API responses isolate the browsing context and stay same-site', async () => {
    const res = await request(app).get('/auth/userinfo')

    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin')
    expect(res.headers['cross-origin-resource-policy']).toBe('same-site')
  })

  test('attachments can be embedded cross-origin', async () => {
    const attachment = await CommonAttachment.create({
      id: '6f1c3a52-0b7e-4c1d-9a55-2a3e2d1f4b10',
      originalFileName: 'photo.png',
      metadata: { size: 13, hash: 'hash', type: 'image/png' },
      userId: 1,
    } as CommonAttachment)

    const res = await request(app).get(
      `/attachments/${attachment.id}/photo.png`
    )

    expect(res.status).toBe(200)
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin')
  })
})
