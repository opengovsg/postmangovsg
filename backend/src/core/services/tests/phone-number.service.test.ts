/* eslint-disable jest/expect-expect */
import { PhoneNumberService } from '@core/services/phone-number.service'

const DEFAULT_COUNTRY = 'SG'

const expectNormalised = (input: string, expected: string): void => {
  const normalised = PhoneNumberService.normalisePhoneNumber(
    input,
    DEFAULT_COUNTRY
  )
  expect(normalised).toEqual(expected)
}

describe('Phone Number Service', () => {
  describe('normalisePhoneNumber', () => {
    describe('local phone numbers', () => {
      test('should remain unchanged if it is already formatted', () => {
        expectNormalised('+6591234567', '+6591234567')
      })

      test('should prepend phone number with + if it is missing', () => {
        expectNormalised('6591234567', '+6591234567')
      })

      test('should prepend default country code if not provided', () => {
        expectNormalised('91234567', '+6591234567')
      })

      test('should normalise number starting with 8', () => {
        expectNormalised('81234567', '+6581234567')
      })

      test('should normalise number starting with 6', () => {
        expectNormalised('65123456', '+6565123456')
      })

      test('should normalise number starting with 80', () => {
        expectNormalised('80123456', '+6580123456')
      })

      test('should normalise number starting with 802', () => {
        expectNormalised('80223456', '+6580223456')
      })

      test('should normalise number starting with 89', () => {
        expectNormalised('89123456', '+6589123456')
      })

      test('should throw an error if local phone number not starting with 9, 8 or 6', () => {
        expect(() => {
          PhoneNumberService.normalisePhoneNumber('11234567', DEFAULT_COUNTRY)
        }).toThrow()
      })

      test('should throw an error if local phone number has length < 8', () => {
        expect(() => {
          PhoneNumberService.normalisePhoneNumber('9123456', DEFAULT_COUNTRY)
        }).toThrow()
      })

      test('should throw an error if local phone number has length > 8', () => {
        expect(() => {
          PhoneNumberService.normalisePhoneNumber('912345678', DEFAULT_COUNTRY)
        }).toThrow()
      })
    })

    describe('foreign phone numbers', () => {
      test('should prepend + if not provided', () => {
        expectNormalised('14128018888', '+14128018888')
      })

      test('should throw an error if no country code provided', () => {
        expect(() => {
          PhoneNumberService.normalisePhoneNumber('4128018888', DEFAULT_COUNTRY)
        }).toThrow()
      })
    })

    describe('invalid numbers', () => {
      test('should throw an error for non-numeric phone number', () => {
        expect(() => {
          PhoneNumberService.normalisePhoneNumber(
            'test@test.com',
            DEFAULT_COUNTRY
          )
        }).toThrow()
      })

      test('should throw an error for an empty string', () => {
        expect(() => {
          PhoneNumberService.normalisePhoneNumber('', DEFAULT_COUNTRY)
        }).toThrow()
      })
    })
  })
})
