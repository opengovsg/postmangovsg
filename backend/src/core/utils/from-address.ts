import config from '@core/config'
import {
  escapeFromAddress,
  formatFromAddress,
  parseFromAddress,
} from '@shared/utils/from-address'
import { Joi } from 'celebrate'
import validator from 'validator'

/**
 * Determine if a from is using the default from email address
 */
export const isDefaultFromAddress = (from: string): boolean => {
  const { fromAddress } = parseFromAddress(from)
  const { fromAddress: defaultFromAddress } = parseFromAddress(
    config.get('mailFrom')
  )
  return fromAddress === defaultFromAddress
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
