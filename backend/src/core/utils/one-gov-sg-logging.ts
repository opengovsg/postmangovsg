import { Event } from '@sentry/node'

export const isOneGovSgCallbackPath = (path: string): boolean =>
  /^\/v1\/auth\/one-gov-sg\/callback\/?$/i.test(path)

/** Strip callback secrets from Sentry's default request capture on error. */
export const redactOneGovSgSentryEvent = (event: Event): Event => {
  const request = event.request
  if (!request?.url) return event
  try {
    const url = new URL(request.url)
    if (isOneGovSgCallbackPath(url.pathname)) {
      event.request = {
        method: request.method,
        url: `${url.origin}${url.pathname}`,
      }
    }
  } catch {
    // Sentry can also receive events without an absolute request URL.
  }
  return event
}
