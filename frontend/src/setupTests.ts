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

// Enable API mocking before tests.
beforeAll(() => server.listen())

// Fake timers using Jest
beforeEach(() => jest.useFakeTimers())

afterEach(() => {
  // Reset any runtime request handlers we may add during the tests.
  server.resetHandlers()

  // Running all pending timers and switching to real timers using Jest
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

// Disable API mocking after the tests are done.
afterAll(() => server.close())
