// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
require('module-alias/register')
import config from '@core/config'
config.validate()

import { getHttpLogTransportOpts } from '@shared/tracing'
import { transports } from 'winston'
import { addTransport } from '@core/logger'
addTransport(new transports.Http(getHttpLogTransportOpts()))

/*Load the app after we make sure that the sensitive env vars exist */
import 'source-map-support/register'
import { loaders } from '@core/loaders'

const start = async (): Promise<void> => {
  await loaders()
}

start().catch((err) => {
  console.error(err)
})
