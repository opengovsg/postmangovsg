// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock the Canvas API
import 'jest-canvas-mock'

// Import locales for I18nProvider
import 'locales'

// Mock SubtleCrypto APIs
import { Crypto } from '@peculiar/webcrypto'
// TODO: Avoid any
;(global as any).crypto = new Crypto()

// import API mocking utilities from Mock Service Worker
import { server } from './test-utils'

beforeAll(() => {
  // Enable API mocking before tests.
  server.listen({ onUnhandledRequest: 'error' })

  // Workaround for issue with 'muted' property not being treated as a default attribute
  // see: https://github.com/testing-library/react-testing-library/issues/470
  Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
    set: jest.fn(),
  })
})

// Fake timers using Jest
beforeEach(() => jest.useFakeTimers())

afterEach(() => {
  // Running all pending timers and switching to real timers using Jest
  jest.runOnlyPendingTimers()
  jest.useRealTimers()

  // Reset any runtime request handlers we may add during the tests.
  server.resetHandlers()
})

// Disable API mocking after the tests are done.
afterAll(() => server.close())
