import fs from 'fs'
import createTestCafe from 'testcafe'
import config from './../config'

import { MockMailServer, MockTelegramServer } from './../mocks'
import { waitForAppReady, sequelizeLoader } from './helpers'

const CHROME_BROWSER = 'chrome --allow-insecure-localhost'

const loadServices = async (): Promise<void> => {
  await Promise.all([
    waitForAppReady(),
    MockMailServer.start(),
    MockTelegramServer.start(),
    sequelizeLoader(),
  ])
}

const start = async (): Promise<void> => {
  config.validate()

  await loadServices()

  // Load certificates as SubtleCrypto requires a secure context (HTTPS)
  const { cert, key } = config.get('tls')
  const tlsOptions = {
    key: fs.readFileSync(key),
    cert: fs.readFileSync(cert),
  }

  const testcafe = await createTestCafe('localhost', 1337, 1338, tlsOptions)
  const runner = config.get('liveMode')
    ? testcafe.createLiveModeRunner()
    : testcafe.createRunner()

  const testFiles = config.get('testFiles').split(',')

  try {
    await runner
      .tsConfigPath('./tsconfig.json')
      .src(testFiles)
      .browsers([CHROME_BROWSER])
      .run()
  } finally {
    await testcafe.close()
    process.exit()
  }
}

start().catch((err) => {
  console.error(err)
})
