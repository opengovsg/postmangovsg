import config from '@core/config'
import validator from 'validator'
import { Joi } from 'celebrate'
import { parseFromAddress, formatFromAddress } from '@shared/utils/from-address'

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
    if (validator.isEmail(value, { allow_display_name: true })) {
      const { fromName, fromAddress } = parseFromAddress(value)
      return formatFromAddress(fromName, fromAddress)
    }
    return helpers.error('string.email')
  })
