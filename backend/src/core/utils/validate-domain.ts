import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { Domain } from '@core/models'
import { Transaction } from 'sequelize'
import validator from 'validator'

const logger = loggerWithLabel(module)

const isValidDomain = (domain: string): boolean => {
  // wildcard domain
  // example: .gov.sg
  // allow any emails that have domains ending in .gov.sg to sign in
  const isWildCardDomain =
    domain.startsWith('.') && validator.isEmail(`user@agency${domain}`)

  // specific domain
  // example: @moe.edu.sg
  // allow any emails that are @moe.edu.sg to sign in
  const isSpecificDomain =
    domain.startsWith('@') && validator.isEmail(`user${domain}`)

  return isWildCardDomain || isSpecificDomain
}

/**
 * Checks if email is valid and has a domain that's whitelisted
 * (either in domains table or in env var)
 * @param email
 * @param transaction Sequelize transaction to use for DB lookup (optional)
 */
const validateDomain = async (
  email: string,
  transaction?: Transaction | null
): Promise<boolean> => {
  if (!validator.isEmail(email)) return false

  // First, check if there exists an exact match in the domains table
  const emailDomain = email.substring(email.lastIndexOf('@'))
  const dbDomain = await Domain.findOne({
    where: { domain: emailDomain },
    transaction,
  })
  if (dbDomain !== null) {
    logger.info({
      message: 'Match for email found in domains table',
      email,
      matched: emailDomain,
      action: 'validateDomain',
    })
    return true
  }

  // If not, check env var for matches (either wildcard or exact)
  const configDomains = config.get('domains').split(';')
  const domainsToWhitelist = configDomains.filter(isValidDomain)

  if (domainsToWhitelist.length === 0) {
    throw new Error(
      `No domains were whitelisted - the supplied DOMAIN_WHITELIST is ${config.get(
        'domains'
      )}`
    )
  } else {
    logger.info({
      message: 'Domains whitelisted in env var',
      domainsToWhitelist,
      action: 'validateDomain',
    })
  }

  const matched = domainsToWhitelist.filter((domain) => email.endsWith(domain))
  if (matched.length > 0) {
    logger.info({
      message: 'Match for email found in env var',
      matched,
      email,
      action: 'validateDomain',
    })
  }

  return matched.length > 0
}

export { validateDomain }
