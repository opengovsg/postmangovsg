/* eslint-disable no-console */
// global.console = {
//   ...global.console,
//   log: jest.fn(), // console.log are ignored in tests
//   error: console.error,
//   warn: console.warn,
//   info: console.info,
//   debug: console.debug,
// }

jest.mock('redis', () => jest.requireActual('redis-mock'))

// Mock services
jest.mock('@core/services/mail-client.class')
