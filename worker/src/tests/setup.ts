/* eslint-disable no-console */
global.console = {
  ...global.console,
  log: jest.fn(), // console.log are ignored in tests
  error: jest.fn(),
  warn: console.warn,
  info: console.log,
  debug: console.debug,
}

process.env.NODE_ENV = 'JEST'
// try to set config to force allow sending of mails to test
