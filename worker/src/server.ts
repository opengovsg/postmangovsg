// eslint-disable-next-line @typescript-eslint/no-var-requires
/*Load the app after we make sure that the sensitive env vars exist */
import 'source-map-support/register'

import config from '@core/config'
import { loaders } from '@core/loaders'
import { addTransport } from '@core/logger'
import { getHttpLogTransportOpts } from '@shared/tracing'
import { transports } from 'winston'

require('dotenv').config()
require('module-alias/register')

config.validate()
addTransport(new transports.Http(getHttpLogTransportOpts()))

const start = async (): Promise<void> => {
  await loaders()
}

start().catch((err) => {
  console.error(err)
})
