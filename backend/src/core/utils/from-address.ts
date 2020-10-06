import config from '@core/config'
import validator from 'validator'
import { Joi } from 'celebrate'

/**
 * Parses display name and email address from a From Address like  `DISPLAY_NAME <email@email.com>`
 */
export const parseFromAddress = (
  email: string
): { name: string | null; fromAddress: string } => {
  // Regex from https://github.com/validatorjs/validator.js/blob/685c3d2edef67d68c27193d28db84d08c0f4534a/src/lib/isEmail.js#L18
  // eslint-disable-next-line no-control-regex
  const address = email.match(/^([^\x00-\x1F\x7F-\x9F\cX]+)<(.+)>$/i) // Matches display name if it exists
  if (address !== null) {
    const [, name, fromAddress] = address
    return { name: name.trim(), fromAddress }
  }
  return { name: null, fromAddress: email }
}

/**
 * Constructs email in display name form, if a name is supplied
 */
export const formatFromAddress = (
  name: string | null | undefined,
  fromAddress: string
): string => {
  const from = fromAddress.toLowerCase()
  if (name) return `${name} <${from}>`
  return from
}

export const fromAddressValidator = Joi.string()
  .trim()
  .required()
  .default(config.get('mailFrom'))
  .custom((value: string, helpers: any) => {
    if (validator.isEmail(value, { allow_display_name: true })) {
      const { name, fromAddress } = parseFromAddress(value)
      return formatFromAddress(name, fromAddress)
    }
    return helpers.error('string.email')
  })
