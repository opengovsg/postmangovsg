import {
  parseFromAddress,
  formatFromAddress,
  escapeFromAddress,
} from '../../utils/from-address'

describe('parseFromAddress', () => {
  test('Should parse from with sender name', () => {
    const from = 'Agency User <user@agency.gov.sg>'

    const parsed = parseFromAddress(from)
    expect(parsed).toMatchObject({
      fromName: 'Agency User',
      fromAddress: 'user@agency.gov.sg',
    })
  })

  test('Should parse from without sender name', () => {
    const from = 'user@agency.gov.sg'

    const parsed = parseFromAddress(from)
    expect(parsed).toMatchObject({
      fromName: null,
      fromAddress: 'user@agency.gov.sg',
    })
  })
})

describe('formatFromAddress', () => {
  test('Should format from with name and address', () => {
    const fromName = 'Agency User'
    const fromAddress = 'user@agency.gov.sg'

    const formatted = formatFromAddress(fromName, fromAddress)
    expect(formatted).toStrictEqual('Agency User <user@agency.gov.sg>')
  })

  test('Should format from with only address', () => {
    const fromAddress = 'user@agency.gov.sg'

    const formatted = formatFromAddress(null, fromAddress)
    expect(formatted).toStrictEqual('user@agency.gov.sg')
  })

  test('Should lowercase from address', () => {
    const fromName = 'Agency User'
    const fromAddress = 'USER@agency.gov.sg'

    const formatted = formatFromAddress(fromName, fromAddress)
    expect(formatted).toStrictEqual('Agency User <user@agency.gov.sg>')
  })
})

describe('escapeFromAddress', () => {
  test('Should escape from name with double quotes', () => {
    const from = 'User (Agency) <user@agency.gov.sg>'

    const escaped = escapeFromAddress(from)
    expect(escaped).toStrictEqual('"User (Agency)" <user@agency.gov.sg>')
  })
})
