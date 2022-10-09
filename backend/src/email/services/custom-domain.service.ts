import dns from 'dns'
import AWS from 'aws-sdk'
import escapeHTML from 'escape-html'
import config from '@core/config'

import { EmailFromAddress } from '@email/models'
import { MailService } from '@core/services'
import { loggerWithLabel } from '@core/logger'
import {
  extractDomainFromEmail,
  formatFromAddress,
} from '@shared/utils/from-address'

const logger = loggerWithLabel(module)
const backendSesRegion = config.get('mailOptions.host').split('.')[1]
const backendSes = new AWS.SES({ region: backendSesRegion })
const workerSesRegion = config.get('mailOptions.workerHost').split('.')[1]
const workerSes = new AWS.SES({ region: workerSesRegion })
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
    await Promise.all(
      tokens.map(async (token) => {
        const cname = `${token}._domainkey.${domain}`
        const [result] = await dns.promises.resolve(cname, 'CNAME')
        if (result !== `${token}.dkim.amazonses.com`) {
          throw new Error(`Dkim record doesn't match for ${email}`)
        }
      })
    )
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
 * Checks that the email address is verified with AWS
 * @returns DKIM tokens generated for the email address
 * @throws Error if the domain's dns do not have the cname records
 */
const verifyEmailWithAWS = async (
  email: string,
  ses: AWS.SES,
  region: string
): Promise<Array<string>> => {
  // Get the dkim attributes for the email address and domain
  const emailDomain = extractDomainFromEmail(email)
  const params = {
    Identities: [email, emailDomain],
  }
  const { DkimAttributes } = await ses
    .getIdentityDkimAttributes(params)
    .promise()

  if (
    !DkimAttributes ||
    (!DkimAttributes[email] && !DkimAttributes[emailDomain])
  ) {
    return logVerificationAWSFailureAndThrowError(email, region)
  }

  // prioritize email address over domain
  const { DkimVerificationStatus: verificationStatus, DkimTokens: dkimTokens } =
    DkimAttributes[email] || DkimAttributes[emailDomain]

  // Check verification status & make sure dkim tokens are present
  if (verificationStatus !== 'Success' || !dkimTokens) {
    return logVerificationAWSFailureAndThrowError(email, region)
  }
  return dkimTokens
}

const logVerificationAWSFailureAndThrowError = (
  email: string,
  region: string
) => {
  logger.error({
    message: 'Verification on AWS failed',
    email,
    region,
    action: 'verifyEmailWithAWS',
  })
  throw new Error(
    `This From Address cannot be used to send emails. Select another email address to send from, or contact us to investigate.`
  )
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
    } as EmailFromAddress)
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
  const [dkimTokensBackend, dkimTokensWorker] = await Promise.all([
    verifyEmailWithAWS(email, backendSes, backendSesRegion),
    verifyEmailWithAWS(email, workerSes, workerSesRegion),
  ])
  await verifyCnames([...dkimTokensBackend, ...dkimTokensWorker], email)
}

const sendValidationMessage = async (
  recipient: string,
  from: string
): Promise<void> => {
  const fromAddress = from || config.get('mailFrom')
  const appName = config.get('APP_NAME')
  await MailService.mailClient.sendMail({
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
