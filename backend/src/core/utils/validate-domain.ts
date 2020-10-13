import validator from 'validator'
import Logger from '@core/logger'
import config from '@core/config'

const logger = Logger.loggerWithLabel(module)

type ValidateDomainFunction = (email: string) => boolean
const getValidateDomain = (domains: string): ValidateDomainFunction => {
  const domainsToWhitelist: string[] = domains
    .split(';')
    .map((domain) => {
      if (domain.startsWith('.') && validator.isEmail(`user@agency${domain}`)) {
        // wildcard domain
        // example: .gov.sg
        // allow any emails that have domains ending in .gov.sg to sign in
        return domain
      } else if (domain.startsWith('@') && validator.isEmail(`user${domain}`)) {
        // specific domain
        // example: @moe.edu.sg
        // allow any emails that are @moe.edu.sg to sign in
        return domain
      }
      return ''
    })
    .filter(Boolean)

  if (domainsToWhitelist.length === 0) {
    throw new Error(
      `No domains were whitelisted - the supplied DOMAIN_WHITELIST is ${domains}`
    )
  } else {
    logger.info({
      message: 'Domains whitelisted',
      domainsToWhitelist,
      action: 'getValidateDomain',
    })
  }
  return (email): boolean => {
    return (
      validator.isEmail(email) &&
      domainsToWhitelist.some((domain) => email.endsWith(domain))
    )
  }
}

const validateDomain = getValidateDomain(config.get('domains'))

export { validateDomain }
