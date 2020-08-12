import waitOn from 'wait-on'
import { customAlphabet } from 'nanoid'
import { ClientFunction } from 'testcafe'
import config from './../config'

// MailDev expects all email addresses to be lowercase
const nanoid = customAlphabet('1234567890abcdef', 5)

/**
 * Retrieve the current page's URL
 */
export const getPageUrl = ClientFunction((): string => document.location.href)

/**
 * Wait for the application backend and frontend to be ready
 */
export const waitForAppReady = async (): Promise<void> => {
  const frontendUrl = config.get('frontendUrl')
  const backendUrl = config.get('backendUrl')

  return waitOn({
    resources: [frontendUrl, backendUrl],
  }).then(() => {
    console.log(`Application ready at ${backendUrl} and ${frontendUrl}`)
  })
}

/**
 * Generate a new random email address
 */
export const generateRandomEmail = (domain = 'open.gov.sg'): string => {
  return `test-${nanoid()}@${domain}`
}
