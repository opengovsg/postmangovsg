import dns from 'dns'
import AWS from 'aws-sdk'

import { User } from '@core/models'

const ses = new AWS.SES({ region: 'eu-central-1' })
/**
 * Verifies if the cname records are in the email's domain dns
 * @throws Error if verification fails
 */
const verifyCnames = async (
  tokens: Array<string>,
  email: string
): Promise<void> => {
  // get email domain
  const domain = email.slice(email.lastIndexOf('@') + 1)
  const cnames = tokens.map((token) => `${token}._domainkey.${domain}`)
  try {
    for (const cname of cnames) {
      await dns.promises.resolve(cname, 'CNAME')
    }
  } catch (e) {
    throw new Error(`Verification of dkim records failed for ${email}`)
  }
}

/**
 * Verifies if the cname records are in the email's domain dns
 * @throws Error if the domain's dns do not have the cname records
 */
const verifyEmailWithAWS = async (email: string): Promise<Array<string>> => {
  // Get the dkim attributes for the email address
  const params = {
    Identities: [email],
  }
  const { DkimAttributes } = await ses
    .getIdentityDkimAttributes(params)
    .promise()
  if (
    DkimAttributes[email]?.DkimVerificationStatus! !== 'Success' ||
    DkimAttributes
  ) {
    throw new Error(`Email address not verified by AWS SES. email=${email}`)
  }
  return DkimAttributes[email]?.DkimTokens
}

/**
 * Verifies if the email provided matches the user's
 * @throws Error if the emails doesn't match
 */
const verifyEmail = async (email: string, userId: number): Promise<void> => {
  // Verify email address that is provided
  const user = await User.findOne({ where: { id: userId } })
  if (user === null) throw new Error(`Failed to find user id: ${userId}`)

  if (user.email !== email) {
    throw new Error(
      `From email address not allowed. User's email: ${user.email}, given: ${email} `
    )
  }
}

export const CustomDomainService = {
  verifyCnames,
  verifyEmail,
  verifyEmailWithAWS,
}
