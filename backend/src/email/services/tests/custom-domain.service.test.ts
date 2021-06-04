import AWS from 'aws-sdk'
import dns from 'dns'
import { Sequelize } from 'sequelize-typescript'
import { mocked } from 'ts-jest/utils'

import { RedisService } from '@core/services'
import { CustomDomainService } from '@email/services'

import sequelizeLoader from '@test-utils/sequelize-loader'
import { MockAws } from '@test-utils/aws'

jest.mock('dns')
const mockDns = mocked(dns)

jest.mock('aws-sdk', () => ({
  ...jest.requireActual('aws-sdk'),
  SES: jest.fn(),
}))

let sequelize: Sequelize

beforeAll(async () => {
  sequelize = await sequelizeLoader(process.env.JEST_WORKER_ID || '1')
})

afterAll(async () => {
  await sequelize.close()
  await new Promise((resolve) => RedisService.otpClient.quit(resolve))
  await new Promise((resolve) => RedisService.sessionClient.quit(resolve))
  await new Promise((resolve) => setImmediate(resolve))
})

describe('verifyFromAddress', () => {
  const mockSesResponses = (
    verificationAttrs: AWS.SES.VerificationAttributes = {},
    dkimAttrs: AWS.SES.DkimAttributes = {}
  ): void => {
    MockAws.spyOn('SES', 'getIdentityVerificationAttributes').mockReturnValue({
      promise: () =>
        Promise.resolve({ VerificationAttributes: verificationAttrs }),
    })
    MockAws.spyOn('SES', 'getIdentityDkimAttributes').mockReturnValue({
      promise: () => Promise.resolve({ DkimAttributes: dkimAttrs }),
    })
  }

  test('Verified email address with no verified domain', async () => {
    const verificationAttrs = {
      'user@agency.gov.sg': {
        VerificationStatus: 'Success',
      },
    }
    const dkimAttrs = {
      'agency.gov.sg': {
        DkimVerificationStatus: 'Success',
        DkimTokens: ['token'],
        DkimEnabled: true,
      },
    }
    mockSesResponses(verificationAttrs, dkimAttrs)
    mockDns.promises = {
      ...jest.requireActual('dns').promises,
      resolve: jest.fn().mockResolvedValueOnce(['token.dkim.amazonses.com']),
    }

    await expect(
      CustomDomainService.verifyFromAddress('user@agency.gov.sg')
    ).resolves.not.toThrow()
  })

  test('Verified domain with no verified email', async () => {
    const verificationAttrs = {
      'agency.gov.sg': {
        VerificationStatus: 'Success',
        VerificationToken: 'token',
      },
    }
    const dkimAttrs = {
      'agency.gov.sg': {
        DkimVerificationStatus: 'Success',
        DkimTokens: ['token'],
        DkimEnabled: true,
      },
    }
    mockSesResponses(verificationAttrs, dkimAttrs)
    mockDns.promises = {
      ...jest.requireActual('dns').promises,
      resolve: jest
        .fn()
        .mockResolvedValueOnce([['token']]) // For domain TXT record
        .mockResolvedValueOnce(['token.dkim.amazonses.com']), // For DKIM CNAME record
    }

    await expect(
      CustomDomainService.verifyFromAddress('user@agency.gov.sg')
    ).resolves.not.toThrow()
  })

  test('Fail if neither email or domain is verified', async () => {
    mockSesResponses()
    await expect(
      CustomDomainService.verifyFromAddress('user@agency.gov.sg')
    ).rejects.toThrow()
  })

  test('Fail if domain verification is not successful', async () => {
    const statuses = ['Pending', 'Failure', 'TemporaryFailure', 'NotStarted']
    statuses.forEach(async (VerificationStatus) => {
      const verificationAttrs = {
        'agency.gov.sg': {
          VerificationStatus,
          VerificationToken: 'token',
        },
      }
      mockSesResponses(verificationAttrs)
      await expect(
        CustomDomainService.verifyFromAddress('user@agency.gov.sg')
      ).rejects.toThrow()
    })
  })

  test('Fail if email address verification is not successful', async () => {
    const statuses = ['Pending', 'Failure', 'TemporaryFailure', 'NotStarted']
    statuses.forEach(async (VerificationStatus) => {
      const verificationAttrs = {
        'user@agency.gov.sg': {
          VerificationStatus,
          VerificationToken: 'token',
        },
      }
      mockSesResponses(verificationAttrs)
      await expect(
        CustomDomainService.verifyFromAddress('user@agency.gov.sg')
      ).rejects.toThrow()
    })
  })

  test('Fail if email address is pending verification', async () => {
    const verificationAttrs = {
      'agency.gov.sg': {
        VerificationStatus: 'Pending',
        VerificationToken: 'token',
      },
    }
    mockSesResponses(verificationAttrs)
    await expect(
      CustomDomainService.verifyFromAddress('user@agency.gov.sg')
    ).rejects.toThrow()
  })

  test('Fail if domain is verified but TXT records are not set', async () => {
    const verificationAttrs = {
      'agency.gov.sg': {
        VerificationStatus: 'Success',
        VerificationToken: 'token',
      },
    }
    mockSesResponses(verificationAttrs)
    mockDns.promises = {
      ...jest.requireActual('dns').promises,
      resolve: jest.fn().mockRejectedValueOnce(new Error()),
    }

    await expect(
      CustomDomainService.verifyFromAddress('user@agency.gov.sg')
    ).rejects.toThrow()
  })

  test('Fail if email is verified but DKIM records are not set', async () => {
    const verificationAttrs = {
      'user@agency.gov.sg': {
        VerificationStatus: 'Success',
      },
    }
    const dkimAttrs = {
      'agency.gov.sg': {
        DkimVerificationStatus: 'Success',
        DkimTokens: ['token'],
        DkimEnabled: true,
      },
    }
    mockSesResponses(verificationAttrs, dkimAttrs)
    mockDns.promises = {
      ...jest.requireActual('dns').promises,
      resolve: jest
        .fn()
        .mockResolvedValueOnce([['token']]) // For domain TXT record
        .mockResolvedValueOnce(['token.dkim.amazonses.com']), // For DKIM CNAME record
    }
    mockDns.promises = {
      ...jest.requireActual('dns').promises,
      resolve: jest
        .fn()
        .mockResolvedValueOnce([['token']]) // For domain TXT record
        .mockRejectedValueOnce(new Error('Missing dkim records')), // For DKIM CNAME record
    }

    await expect(
      CustomDomainService.verifyFromAddress('user@agency.gov.sg')
    ).rejects.toThrow()
  })

  test('Fail if domain is verified but DKIM records are not set', async () => {
    const verificationAttrs = {
      'agency.gov.sg': {
        VerificationStatus: 'Success',
        VerificationToken: 'token',
      },
    }
    const dkimAttrs = {
      'agency.gov.sg': {
        DkimVerificationStatus: 'Success',
        DkimTokens: ['token'],
        DkimEnabled: true,
      },
    }
    mockSesResponses(verificationAttrs, dkimAttrs)
    mockDns.promises = {
      ...jest.requireActual('dns').promises,
      resolve: jest
        .fn()
        .mockResolvedValueOnce([['token']]) // For domain TXT record
        .mockResolvedValueOnce(['token.dkim.amazonses.com']), // For DKIM CNAME record
    }
    mockDns.promises = {
      ...jest.requireActual('dns').promises,
      resolve: jest
        .fn()
        .mockResolvedValueOnce([['token']]) // For domain TXT record
        .mockRejectedValueOnce(new Error('Missing dkim records')), // For DKIM CNAME record
    }

    await expect(
      CustomDomainService.verifyFromAddress('user@agency.gov.sg')
    ).rejects.toThrow()
  })
})
