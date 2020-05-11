global.console = {
    log: jest.fn(), // console.log are ignored in tests
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  }