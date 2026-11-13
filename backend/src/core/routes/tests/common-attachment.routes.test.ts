import request from 'supertest'
import { Readable } from 'stream'
import { Sequelize } from 'sequelize-typescript'
import { S3 } from '@aws-sdk/client-s3'
import initialiseServer from '@test-utils/server'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { User } from '@core/models'
import { CommonAttachment } from '@email/models/common-attachment'

jest.mock('@aws-sdk/client-s3')
jest.unmock('uuid')

const app = initialiseServer(true)
let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
})

beforeEach(() => {
  jest.mocked(S3.prototype.getObject).mockImplementation(async () => ({
    Body: Readable.from([Buffer.from('file contents')]),
  }))
})

afterEach(async () => {
  await CommonAttachment.destroy({ where: {}, force: true })
})

afterAll(async () => {
  await User.destroy({ where: {} })
  await sequelize.close()
  await (app as any).cleanup()
})

describe('GET /attachments/{attachmentId}/{fileName}', () => {
  test.each([
    [
      'report.pdf',
      'application/pdf',
      'application/pdf',
      "inline; filename*=UTF-8''report.pdf",
    ],
    [
      'photo.png',
      'image/png',
      'image/png',
      "inline; filename*=UTF-8''photo.png",
    ],
    [
      'memo.m4a',
      'audio/x-m4a',
      'audio/x-m4a',
      "inline; filename*=UTF-8''memo.m4a",
    ],
    [
      'page.xml',
      'image/x+xml',
      'application/octet-stream',
      "attachment; filename*=UTF-8''page.xml",
    ],
    [
      'page.html',
      'text/html',
      'application/octet-stream',
      "attachment; filename*=UTF-8''page.html",
    ],
    [
      'logo.svg',
      'image/svg+xml',
      'application/octet-stream',
      "attachment; filename*=UTF-8''logo.svg",
    ],
  ])(
    'serves %s uploaded as %s with Content-Type %s and Content-Disposition %s',
    async (fileName, uploadedType, servedType, servedDisposition) => {
      const attachment = await CommonAttachment.create({
        id: '6f1c3a52-0b7e-4c1d-9a55-2a3e2d1f4b10',
        originalFileName: fileName,
        metadata: { size: 13, hash: 'hash', type: uploadedType },
        userId: 1,
      } as CommonAttachment)

      const res = await request(app)
        .get(`/attachments/${attachment.id}/${encodeURIComponent(fileName)}`)
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = []
          response.on('data', (chunk: Buffer) => chunks.push(chunk))
          response.on('end', () => callback(null, Buffer.concat(chunks)))
        })

      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toBe(servedType)
      expect(res.headers['content-disposition']).toBe(servedDisposition)
      expect(res.body.toString()).toBe('file contents')
    }
  )
})

describe('POST /attachments then GET /attachments/{attachmentId}/{fileName}', () => {
  test('serves an uploaded non-ASCII file name back unchanged', async () => {
    const fileName = '通知 (1).txt'
    const upload = await request(app)
      .post('/attachments')
      .attach('attachments', Buffer.from('file contents'), {
        filename: fileName,
        contentType: 'text/plain',
      })
    expect(upload.status).toBe(200)

    const res = await request(app).get(
      `/attachments/${upload.body.id}/${encodeURIComponent(fileName)}`
    )

    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toBe(
      "inline; filename*=UTF-8''%E9%80%9A%E7%9F%A5%20%281%29.txt"
    )
  })
})
