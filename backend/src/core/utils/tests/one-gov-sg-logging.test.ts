import { isOneGovSgCallbackPath } from '../one-gov-sg-logging'

test('recognizes callback route variants accepted by Express', () => {
  expect(isOneGovSgCallbackPath('/v1/auth/one-gov-sg/callback')).toBe(true)
  expect(isOneGovSgCallbackPath('/V1/AUTH/ONE-GOV-SG/CALLBACK/')).toBe(true)
  expect(isOneGovSgCallbackPath('/v1/auth/one-gov-sg/login')).toBe(false)
})
