import request from 'supertest'
import { Sequelize } from 'sequelize-typescript'

import { User } from '@core/models'
import { CredentialService } from '@core/services/credential.service'
import { GovsgMessageTransactional, GovsgTemplate } from '@govsg/models'
import initialiseServer from '@test-utils/server'
import sequelizeLoader from '@test-utils/sequelize-loader'

let sequelize: Sequelize
let apiKey: string
let templateId: number

const app = initialiseServer(false)

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
})

beforeEach(async () => {
  const user = await User.create({
    id: 1,
    email: 'user_1@agency.gov.sg',
  } as User)
  const { plainTextKey } = await (
    app as any as { credentialService: CredentialService }
  ).credentialService.generateApiKey(user.id, 'test api key', [user.email])
  apiKey = plainTextKey
  const template = await GovsgTemplate.create({
    name: 'another agency template',
    body: 'Hello {{recipient_name}}',
    params: ['recipient_name'],
  } as GovsgTemplate)
  templateId = template.id
})

afterEach(async () => {
  await GovsgMessageTransactional.destroy({ where: {} })
  await GovsgTemplate.destroy({ where: {} })
  await User.destroy({ where: {} })
})

afterAll(async () => {
  await sequelize.close()
  await (app as any).cleanup()
})

describe('/transactional/govsg', () => {
  test('POST /send is not served and saves no message', async () => {
    const res = await request(app)
      .post('/transactional/govsg/send')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        recipient: '+6581111111',
        template_id: templateId,
        params: { recipient_name: 'PoC' },
      })

    expect(res.status).toBe(404)
    expect(await GovsgMessageTransactional.count()).toBe(0)
  })

  test('GET / is not served', async () => {
    const res = await request(app)
      .get('/transactional/govsg')
      .set('Authorization', `Bearer ${apiKey}`)

    expect(res.status).toBe(404)
  })
})
