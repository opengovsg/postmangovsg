import dns from 'dns'
import AWS from 'aws-sdk'
import escapeHTML from 'escape-html'
import config from '@core/config'

import { EmailFromAddress } from '@email/models'
import { MailService } from '@core/services'
import logger from '@core/logger'

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
    logger.error(`Verification of dkim records failed. email=${email}`)
    throw new Error(
      `This From Address cannot be used to send emails. Select another email address to send from.`
    )
  }
}

/**
 * Checks that the email address is verified with AWS
 * @returns DKIM tokens generated for the email address
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

  const verificationStatus = DkimAttributes[email]?.DkimVerificationStatus
  const dkimTokens = DkimAttributes[email]?.DkimTokens

  // Check verification status & make sure dkim tokens are present
  if (!verificationStatus || verificationStatus !== 'Success' || !dkimTokens) {
    logger.error(`Verification on AWS failed. email=${email}`)
    throw new Error(
      `This From Address cannot be used to send emails. Select another email address to send from.`
    )
  }
  // Make sure the dkim tokens are there.
  return dkimTokens
}

/**
 * Checks if the email address is already in email_from_address
 */
const existsFromAddress = async (email: string): Promise<boolean> => {
  return !!(await EmailFromAddress.findOne({
    where: { email },
  }))
}

/**
 * Stores the provided email address in verified_email table
 * @throws Error if it fails to store the email address.
 */
const storeFromAddress = async (email: string): Promise<void> => {
  try {
    await EmailFromAddress.findOrCreate({
      where: {
        email,
      },
    })
  } catch (e) {
    throw new Error(`Failed to store verified email for ${email}`)
  }
}

/**
 * 1. Checks if email is already verified
 * 2. With AWS to ensure that we can use the email address to send
 * 3. Checks the domain's dns to ensure that the cnames are there
 */
const verifyFromAddress = async (email: string): Promise<void> => {
  const dkimTokens = await verifyEmailWithAWS(email)

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
  storeFromAddress,
  verifyFromAddress,
  sendValidationMessage,
}
