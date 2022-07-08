import { Sequelize } from 'sequelize-typescript'
import sequelizeLoader from '@test-utils/sequelize-loader'

import { Campaign, Credential, JobQueue, User } from '@core/models'
import { ChannelType, JobStatus } from '@core/constants'
import { get } from 'lodash'
import { QueryTypes } from 'sequelize'
import { up, down } from '../20210429045222-create-is-credential-used-function'

let sql: Sequelize
const credNameNotUsed = 'cred-not-used'
const credNameUsed = 'cred-used'

beforeAll(async () => {
  sql = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
  await up(sql.getQueryInterface())
})

beforeEach(async () => {
  const [cred1] = await Credential.bulkCreate([
    { name: credNameUsed } as Credential,
    { name: credNameNotUsed } as Credential,
  ])
  await User.create({ id: 1, email: 'user@agency.gov.sg' } as User)
  const campaign = await Campaign.create({
    name: 'campaign-1',
    userId: 1,
    type: ChannelType.SMS,
    credName: cred1.name,
    valid: true,
    protect: false,
  } as Campaign)
  await JobQueue.create({
    campaignId: campaign.id,
    status: JobStatus.Sending,
  } as JobQueue)
})
afterEach(async () => {
  await JobQueue.destroy({ where: {} })
  await Campaign.destroy({ where: {} })
  await User.destroy({ where: {} })
  await Credential.destroy({ where: {} })
})

afterAll(async () => {
  await down(sql.getQueryInterface())
  await sql.close()
})

describe('is_credential_used(campaignId) SQL function', () => {
  test('returns true if the credential is already used', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-2',
      userId: 1,
      type: ChannelType.SMS,
      credName: credNameUsed,
      valid: true,
      protect: false,
    } as Campaign)
    const [result] = await sql.query(
      'SELECT is_credential_used(:campaignId);',
      {
        replacements: { campaignId: campaign.id },
        type: QueryTypes.SELECT,
      }
    )
    expect(get(result, 'is_credential_used') === true)
  })

  test('returns null if the credential is not used yet', async () => {
    const campaign = await Campaign.create({
      name: 'campaign-2',
      userId: 1,
      type: ChannelType.SMS,
      credName: credNameNotUsed,
      valid: true,
      protect: false,
    } as Campaign)
    const [result] = await sql.query(
      'SELECT is_credential_used(:campaignId);',
      {
        replacements: { campaignId: campaign.id },
        type: QueryTypes.SELECT,
      }
    )
    expect(get(result, 'is_credential_used')).toBeNull()
  })

  test('return null if the credential is only used once on another campaign of type email', async () => {
    const anotherEmailCampaign = await Campaign.create({
      name: 'campaign-2',
      userId: 1,
      type: ChannelType.Email,
      credName: credNameNotUsed,
      valid: true,
      protect: false,
    } as Campaign)
    await JobQueue.create({
      campaignId: anotherEmailCampaign.id,
      status: JobStatus.Sending,
    } as JobQueue)
    const campaign = await Campaign.create({
      name: 'campaign-3',
      userId: 1,
      type: ChannelType.Email,
      credName: credNameNotUsed,
      valid: true,
      protect: false,
    } as Campaign)
    const [result] = await sql.query(
      'SELECT is_credential_used(:campaignId);',
      {
        replacements: { campaignId: campaign.id },
        type: QueryTypes.SELECT,
      }
    )
    expect(get(result, 'is_credential_used')).toBeNull()
  })

  test('return true if the credential is used twice already on other campaigns of type email', async () => {
    const otherEmailCampaigns = await Campaign.bulkCreate([
      {
        name: 'campaign-2',
        userId: 1,
        type: ChannelType.Email,
        credName: credNameNotUsed,
        valid: true,
        protect: false,
      } as Campaign,
      {
        name: 'campaign-3',
        userId: 1,
        type: ChannelType.Email,
        credName: credNameNotUsed,
        valid: true,
        protect: false,
      } as Campaign,
    ])
    await JobQueue.bulkCreate(
      otherEmailCampaigns.map(
        (c) =>
          ({
            campaignId: c.id,
            status: JobStatus.Sending,
          } as JobQueue)
      )
    )
    const campaign = await Campaign.create({
      name: 'campaign-4',
      userId: 1,
      type: ChannelType.Email,
      credName: credNameNotUsed,
      valid: true,
      protect: false,
    } as Campaign)
    const [result] = await sql.query(
      'SELECT is_credential_used(:campaignId);',
      {
        replacements: { campaignId: campaign.id },
        type: QueryTypes.SELECT,
      }
    )
    expect(get(result, 'is_credential_used')).toBe(true)
  })

  // practically this case will never happen, but we still have this test to narrow
  // down the behavior of this function
  test('return true if the credential is alread used once on another campaign not type email even if the new campaign is of type email', async () => {
    const anotherEmailCampaign = await Campaign.create({
      name: 'campaign-2',
      userId: 1,
      type: ChannelType.SMS,
      credName: credNameNotUsed,
      valid: true,
      protect: false,
    } as Campaign)
    await JobQueue.create({
      campaignId: anotherEmailCampaign.id,
      status: JobStatus.Sending,
    } as JobQueue)
    const campaign = await Campaign.create({
      name: 'campaign-3',
      userId: 1,
      type: ChannelType.Email,
      credName: credNameNotUsed,
      valid: true,
      protect: false,
    } as Campaign)
    const [result] = await sql.query(
      'SELECT is_credential_used(:campaignId);',
      {
        replacements: { campaignId: campaign.id },
        type: QueryTypes.SELECT,
      }
    )
    expect(get(result, 'is_credential_used')).toBe(true)
  })
})
