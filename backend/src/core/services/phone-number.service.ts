import { CountryCode, parsePhoneNumber } from 'libphonenumber-js/max'

const SG_NUMBER_FORMAT = /^(\+?65)?(8|9)\d{7}$/

/**
 * Validate and normalise phone number format. Default country code will
 * be added if no country code is provided.
 * @param phoneNumber
 * @return formatted - E.164 formatted phone number
 */
const normalisePhoneNumber = (
  phoneNumber: string,
  defaultCountry: string
): string => {
  let normalised = parsePhoneNumber(phoneNumber, defaultCountry as CountryCode)

  // Validate SG numbers with a custom regex because libphonenumber's validation is out of date
  if (!SG_NUMBER_FORMAT.test(phoneNumber) && !normalised.isValid()) {
    // If parsing fails with default country code and does not match a Singaporean number format,
    // we retry by prepending a + sign.
    normalised = parsePhoneNumber(`+${phoneNumber}`)
    if (!normalised.isValid()) {
      throw new Error('Phone number is invalid')
    }
  }

  return normalised.number.toString()
}

export const PhoneNumberService = {
  normalisePhoneNumber,
}
