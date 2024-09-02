import config from '@core/config'
import validator from 'validator'
import { Joi } from 'celebrate'
import {
  parseFromAddress,
  formatFromAddress,
  escapeFromAddress,
} from '@shared/utils/from-address'

/**
 * Determine if a from is using the default from email address
 */
export const isDefaultFromAddress = (from: string): boolean => {
  const { fromAddress } = parseFromAddress(from)
  const { fromAddress: defaultFromAddress } = parseFromAddress(
    config.get('mailFrom')
  )
  // As part of a PSD directive, we have changed the defaultFromAddress to info@mail.postman.gov.sg.
  // To prevent any breaking changes, we must now support both the new and old default address
  const allowedDefaultAddresses = [
    defaultFromAddress,
    'donotreply@mail.postman.gov.sg',
  ]
  return allowedDefaultAddresses.includes(fromAddress)
}

export const fromAddressValidator = Joi.string()
  .trim()
  .default(config.get('mailFrom'))
  .custom((value: string, helpers: any) => {
    // Newer versions of validator library require special characters like period to be enclosed in double quotes.
    // For backward compatibility, we parse and manually quote the sender name before validation.
    const input = escapeFromAddress(value)
    if (validator.isEmail(input, { allow_display_name: true })) {
      const { fromName, fromAddress } = parseFromAddress(value)
      return formatFromAddress(fromName, fromAddress)
    }
    return helpers.error('string.email')
  })
