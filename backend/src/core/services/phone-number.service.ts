import { parsePhoneNumber, CountryCode } from 'libphonenumber-js/max'
import config from '@core/config'

/**
 * Validate and normalise phone number format. Default country code will
 * be added if no country code is provided.
 * @param phoneNumber
 * @return formatted - E.164 formatted phone number
 */
const normalisePhoneNumber = (phoneNumber: string): string => {
  let parsed = parsePhoneNumber(
    phoneNumber,
    config.get('defaultCountry') as CountryCode
  )

  if (!parsed.isValid()) {
    // If parsing fails with default country code, we retry by prepending a + sign.
    parsed = parsePhoneNumber(`+${phoneNumber}`)
    if (!parsed.isValid()) throw new Error('Phone number is invalid')
  }

  return parsed.number.toString()
}

export const PhoneNumberService = {
  normalisePhoneNumber,
}
