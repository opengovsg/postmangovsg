import { Event } from '@sentry/node'
import {
  isOneGovSgCallbackPath,
  redactOneGovSgSentryEvent,
} from '../one-gov-sg-logging'

test('recognizes callback route variants accepted by Express', () => {
  expect(isOneGovSgCallbackPath('/v1/auth/one-gov-sg/callback')).toBe(true)
  expect(isOneGovSgCallbackPath('/V1/AUTH/ONE-GOV-SG/CALLBACK/')).toBe(true)
  expect(isOneGovSgCallbackPath('/v1/auth/one-gov-sg/login')).toBe(false)
})

test('removes callback body, cookies, and query from Sentry errors', () => {
  const event: Event = {
    request: {
      method: 'POST',
      url: 'https://api.postman.gov.sg/v1/auth/one-gov-sg/callback?code=secret',
      data: '{"code":"secret","state":"state"}',
      query_string: 'code=secret',
      cookies: { onegovsg_tx: 'transaction' },
      headers: { cookie: 'onegovsg_tx=transaction' },
    },
  }

  expect(redactOneGovSgSentryEvent(event).request).toEqual({
    method: 'POST',
    url: 'https://api.postman.gov.sg/v1/auth/one-gov-sg/callback',
  })
})
