import dns from 'dns'
import AWS from 'aws-sdk'
import escapeHTML from 'escape-html'
import config from '@core/config'

import { EmailFromAddress } from '@email/models'
import { MailService } from '@core/services'
import { loggerWithLabel } from '@core/logger'
import { formatFromAddress } from '@shared/utils/from-address'

const logger = loggerWithLabel(module)
const [, region] = config.get('mailOptions.host').split('.')
const ses = new AWS.SES({ region: region })
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
  try {
    for (const token of tokens) {
      const cname = `${token}._domainkey.${domain}`
      const [result] = await dns.promises.resolve(cname, 'CNAME')
      if (result !== `${token}.dkim.amazonses.com`) {
        throw new Error(`Dkim record doesn't match for ${email}`)
      }
    }
  } catch (e) {
    logger.error({
      message: 'Verification of dkim records failed',
      email,
      error: e,
      action: 'verifyCnames',
    })
    throw new Error(
      `This From Address cannot be used to send emails. Select another email address to send from, or contact us to investigate.`
    )
  }
}

/**
 * Retrieve DKIM tokens and check that they are verified
 * @param identity either the verified email address or domain
 * @returns DKIM tokens generated for the identity
 * @throws Error if the domain's dns do not have the cname records
 */
const getVerifiedDkimTokens = async (
  identity: string
): Promise<Array<string>> => {
  // Get the dkim attributes for the email address
  const params = {
    Identities: [identity],
  }
  const { DkimAttributes } = await ses
    .getIdentityDkimAttributes(params)
    .promise()

  const verificationStatus = DkimAttributes[identity]?.DkimVerificationStatus
  const dkimTokens = DkimAttributes[identity]?.DkimTokens

  // Check verification status & make sure dkim tokens are present
  if (!verificationStatus || verificationStatus !== 'Success' || !dkimTokens) {
    const message = 'Unable to retrieve DKIM tokens for identity'
    logger.error({
      message,
      identity,
      action: 'getVerifiedDkimTokens',
    })
    throw new Error(message)
  }

  // Make sure the dkim tokens are there.
  return dkimTokens
}

/**
 *  Returns true if the supplied email exist in email_from_address
 */

const existsFromAddress = async (email: string): Promise<boolean> => {
  return !!(await EmailFromAddress.findOne({
    where: {
      email,
    },
  }))
}
/**
 *  Returns the From Address if it exists in email_from_address
 */
const getCustomFromAddress = async (email: string): Promise<string | null> => {
  const result = await EmailFromAddress.findOne({
    where: { email },
  })
  if (result) {
    return formatFromAddress(result.name, result.email)
  }
  return null
}

/**
 * Stores the provided email address in email_from_addresss table
 * @throws Error if it fails to store the email address.
 */
const storeFromAddress = async (
  name: string | null,
  email: string
): Promise<void> => {
  try {
    await EmailFromAddress.upsert({
      name,
      email,
    })
  } catch (err) {
    logger.error({
      message: 'Failed to store email address in EmailFromAddress table',
      email,
      error: err,
      action: 'verifyEmailstoreFromAddressWithAWS',
    })
    throw new Error(`Failed to store verified email for ${email}`)
  }
}

/**
 * 1. Checks if email is already verified
 * 2. With AWS to ensure that we can use the email address to send
 * 3. Checks the domain's dns to ensure that the cnames are there
 */
const verifyFromAddress = async (email: string): Promise<void> => {
  const dkimTokens = await getVerifiedDkimTokens(email)

  await verifyCnames(dkimTokens, email)
}

const sendValidationMessage = async (
  recipient: string,
  from: string
): Promise<void> => {
  const fromAddress = from || config.get('mailFrom')
  const appName = config.get('APP_NAME')
  MailService.mailClient.sendMail({
    from: fromAddress,
    recipients: [recipient],
    subject: `Your From Address has been validated on ${appName}`,
    body: `<p>Congratulations, emails can be sent from this address: <b>${escapeHTML(
      fromAddress
    )}</b> on ${appName}</p>
    <p>The ${appName} Support Team</p>`,
  })
}

export const CustomDomainService = {
  existsFromAddress,
  getCustomFromAddress,
  storeFromAddress,
  verifyFromAddress,
  sendValidationMessage,
}
