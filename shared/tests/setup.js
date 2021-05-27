/* eslint-disable no-console */
global.console = {
  log: jest.fn(), // console.log are ignored in tests
  error: jest.fn(),
  warn: console.warn,
  info: console.info,
  debug: console.debug,
}
