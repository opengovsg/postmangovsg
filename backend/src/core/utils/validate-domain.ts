import validator from 'validator'
import { loggerWithLabel } from '@core/logger'
import config from '@core/config'
import { Agency } from '@core/models'

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

const validateDomain = async (email: string): Promise<boolean> => {
  const configDomains = config.get('domains').split(';')
  const agencyDomains = (await Agency.findAll()).map((agency) => agency.domain)

  const domainsToWhitelist = configDomains
    .concat(agencyDomains)
    .filter(isValidDomain)

  if (domainsToWhitelist.length === 0) {
    throw new Error(
      `No domains were whitelisted - the supplied DOMAIN_WHITELIST is ${config.get(
        'domains'
      )}`
    )
  } else {
    logger.info({
      message: 'Domains whitelisted',
      domainsToWhitelist,
      action: 'validateDomain',
    })
  }

  const matched = domainsToWhitelist.filter((domain) => email.endsWith(domain))
  if (matched.length > 0) {
    logger.info({
      message: 'Match for email found.',
      matched,
      email,
      action: 'validateDomain',
    })
  }

  return validator.isEmail(email) && matched.length > 0
}

export { validateDomain }
