import { Sequelize } from 'sequelize-typescript'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { Domain } from '@shared/core/models'
import { validateDomain } from '@shared/core/utils/validate-domain'
import config from '@core/config'

let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
})

afterEach(async () => {
  await Domain.destroy({ where: {} })
})

afterAll(async () => {
  await sequelize.close()
})

describe('validateDomain', () => {
  it('should match exact domain in database', async () => {
    await Domain.create({
      domain: '@exactdomain.com',
    } as Domain)

    await expect(validateDomain('user@exactdomain.com')).resolves.toBe(true)
  })

  it('should not match subdomains in database', async () => {
    await Domain.create({
      domain: '@school.edu.sg',
    } as Domain)

    await expect(validateDomain('teacher@school.edu.sg')).resolves.toBe(true)
    await expect(validateDomain('student@student.school.edu.sg')).resolves.toBe(
      false
    )
  })

  it('should match exact domains not in domains table but in env var', async () => {
    // Set whitelisted domain config to contain exact domain '@agency.gov.sg'
    jest.spyOn(config, 'get').mockImplementation((name) => {
      if (name === 'domains') return '@agency.gov.sg'
      return null
    })

    await expect(
      Domain.findOne({ where: { domain: '@agency.gov.sg' } })
    ).resolves.toBeNull()

    await expect(validateDomain('user@agency.gov.sg')).resolves.toBe(true)
  })

  it('should match wildcard domains not in domains table but in env var', async () => {
    // Set whitelisted domain config to contain wildcard domain '.gov.sg'
    jest.spyOn(config, 'get').mockImplementation((name) => {
      if (name === 'domains') return '.gov.sg'
      return null
    })

    await expect(
      Domain.findOne({ where: { domain: '@wildcard.gov.sg' } })
    ).resolves.toBeNull()

    await expect(validateDomain('user@wildcard.gov.sg')).resolves.toBe(true)
  })
})
