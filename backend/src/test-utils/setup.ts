/* eslint-disable no-console */
global.console = {
  ...global.console,
  log: jest.fn(), // console.log are ignored in tests
  error: console.error,
  warn: console.warn,
  info: console.log,
  debug: console.debug,
}

// Mock services
jest.mock('@shared/clients/mail-client.class')

jest.mock('@opengovsg/sgid-client', () => {
  return {
    SgidClient: function () {
      return {}
    },
  }
})
