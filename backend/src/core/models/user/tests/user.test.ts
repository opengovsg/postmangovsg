import config from '@core/config'
import { Agency, Domain, User } from '@core/models'
import { validateDomain } from '@core/utils/validate-domain'
import sequelizeLoader from '@test-utils/sequelize-loader'
import { Sequelize } from 'sequelize-typescript'

let sequelize: Sequelize

jest.mock('@core/utils/validate-domain')
const mockValidateDomain = validateDomain as jest.MockedFunction<
  typeof validateDomain
>

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
})

afterEach(async () => {
  await User.destroy({ where: {} })
  await Domain.destroy({ where: {} })
  await Agency.destroy({ where: {} })
})

afterAll(async () => {
  await sequelize.close()
})

describe('BeforeCreate hook', () => {
  test('User with invalid email_domain will not be created', async () => {
    mockValidateDomain.mockResolvedValue(false)
    const INVALID_DOMAIN_EMAIL = 'user@invaliddomain.com'

    await expect(
      User.create({
        email: INVALID_DOMAIN_EMAIL,
      } as User)
    ).rejects.toThrow(
      `User email ${INVALID_DOMAIN_EMAIL} does not end in a whitelisted domain`
    )

    await expect(
      User.findOne({ where: { email: INVALID_DOMAIN_EMAIL } })
    ).resolves.toBeNull()

    mockValidateDomain.mockReset()
  })

  test('User with invalid email_domain should not cause domain or default agency to be created', async () => {
    mockValidateDomain.mockResolvedValue(false)
    const INVALID_DOMAIN_EMAIL = 'user@invaliddomain.com'
    const INVALID_DOMAIN = '@invaliddomain.com'

    // Ensure domain doesn't already exist
    await expect(
      Domain.findOne({ where: { domain: INVALID_DOMAIN } })
    ).resolves.toBeNull()

    // Ensure default agency doesn't already exist
    await expect(
      Agency.findOne({ where: { name: config.get('defaultAgency.name') } })
    ).resolves.toBeNull()

    await expect(
      User.create({
        email: INVALID_DOMAIN_EMAIL,
      } as User)
    ).rejects.toThrow(
      `User email ${INVALID_DOMAIN_EMAIL} does not end in a whitelisted domain`
    )

    // After error is thrown, rest of beforeCreate hook should not run
    await expect(
      Domain.findOne({ where: { domain: INVALID_DOMAIN } })
    ).resolves.toBeNull()
    await expect(
      Agency.findOne({ where: { name: config.get('defaultAgency.name') } })
    ).resolves.toBeNull()

    mockValidateDomain.mockReset()
  })

  test('User with valid email_domain should be created', async () => {
    mockValidateDomain.mockResolvedValue(true)
    const VALID_DOMAIN_EMAIL = 'user@agency.gov.sg'
    const VALID_DOMAIN = '@agency.gov.sg'

    const user = await User.create({
      email: VALID_DOMAIN_EMAIL,
    } as User)
    expect(user).not.toBeNull()
    expect(user).toMatchObject({
      email: VALID_DOMAIN_EMAIL,
      emailDomain: VALID_DOMAIN,
    })

    mockValidateDomain.mockReset()
  })

  test('User with valid but new email_domain should create Domain and default Agency (if not exists)', async () => {
    mockValidateDomain.mockResolvedValue(true)
    const NEW_DOMAIN_EMAIL = 'user@newagency.gov.sg'
    const NEW_DOMAIN = '@newagency.gov.sg'

    // Ensure domain doesn't already exist
    await expect(
      Domain.findOne({ where: { domain: NEW_DOMAIN } })
    ).resolves.toBeNull()

    // Ensure default agency doesn't already exist
    await expect(
      Agency.findOne({ where: { name: config.get('defaultAgency.name') } })
    ).resolves.toBeNull()

    // Create user (and trigger beforeCreate hook) with a single transaction,
    // to simulate behavior of auth service
    await sequelize.transaction(async (transaction) => {
      await User.create({ email: NEW_DOMAIN_EMAIL } as User, { transaction })
    })

    const user = await User.findOne({ where: { email: NEW_DOMAIN_EMAIL } })
    expect(user).not.toBeNull()
    expect(user).toMatchObject({
      email: NEW_DOMAIN_EMAIL,
      emailDomain: NEW_DOMAIN,
    })

    // Ensure default agency is created
    const defaultAgency = await Agency.findOne({
      where: { name: config.get('defaultAgency.name') },
    })
    expect(defaultAgency).not.toBeNull()

    // Ensure new domain is created
    const domain = await Domain.findOne({
      where: { domain: NEW_DOMAIN },
      include: [Agency],
    })
    expect(domain).not.toBeNull()
    expect(domain).toMatchObject({ domain: NEW_DOMAIN })
    expect(domain?.agency).toMatchObject({
      name: defaultAgency?.name,
    })

    mockValidateDomain.mockReset()
  })
})
