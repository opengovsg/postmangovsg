import '@testing-library/jest-dom' // Idiomatic DOM matchers for Jest
import 'jest-canvas-mock' // Mock Canvas API
import { Crypto } from '@peculiar/webcrypto'

import 'locales' // Locales necessary for I18nProvider
import { server } from './test-utils'

// Some tests take longer than the default 5s to run.
// Hence, allow the test timeout to be configured.
const TEST_TIMEOUT = +(process.env.REACT_APP_TEST_TIMEOUT ?? 5000)
jest.setTimeout(TEST_TIMEOUT)

// Mock WebCrypto APIs
// Redeclare the type of `global` as it does not include the `crypto` prop
interface Global extends NodeJS.Global {
  crypto: Crypto
}
declare const global: Global
global.crypto = new Crypto()

beforeAll(() => {
  // Enable API mocking before tests
  server.listen({ onUnhandledRequest: 'error' })

  // Workaround for issue with 'muted' property not being treated as a default attribute
  // see: https://github.com/testing-library/react-testing-library/issues/470
  Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
    set: jest.fn(),
  })
})

afterEach(() => {
  // Reset any runtime request handlers added during tests
  server.resetHandlers()
})

afterAll(() => {
  // Disable API mocking after the tests are done
  server.close()
})
