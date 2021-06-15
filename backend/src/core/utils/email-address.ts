import psl from 'psl'

/**
 * Extract the domain of an email address, excluding it's subdomain.
 * E.g. user@sub.agency.gov.sg -> agency.gov.sg
 * @param email email address to get domain from
 * @returns domain parsed domain for the email address
 * @throws Error if email address is not valid
 */
export const getEmailDomain = (email: string): string => {
  const parts = email.split('@')
  if (parts.length !== 2) {
    throw new Error('Invalid email address')
  }

  const parsed = psl.parse(parts[1])
  if (parsed.error) throw parsed.error

  const { domain } = parsed
  if (!domain) {
    throw new Error('Unable to parse domain for email')
  }

  return domain
}
