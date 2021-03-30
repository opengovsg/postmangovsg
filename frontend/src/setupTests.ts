import '@testing-library/jest-dom' // Idiomatic DOM matchers for Jest
import 'jest-canvas-mock' // Mock Canvas API
import { Crypto } from '@peculiar/webcrypto'

import 'locales' // Locales necessary for I18nProvider
import { server } from './test-utils'

// Mock SubtleCrypto APIs
// TODO: Avoid any
;(global as any).crypto = new Crypto()

beforeAll(() => {
  // Enable API mocking before tests
  server.listen({ onUnhandledRequest: 'error' })

  // Workaround for issue with 'muted' property not being treated as a default attribute
  // see: https://github.com/testing-library/react-testing-library/issues/470
  Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
    set: jest.fn(),
  })
})

beforeEach(() => {
  // Fake timers using Jest
  jest.useFakeTimers()
})

afterEach(() => {
  // Run all pending timers and switch to real timers using Jest
  jest.runOnlyPendingTimers()
  jest.useRealTimers()

  // Reset any runtime request handlers added during tests
  server.resetHandlers()
})

afterAll(() => {
  // Disable API mocking after the tests are done
  server.close()
})
