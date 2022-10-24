/* eslint-disable import/first */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
/*Load the app after we make sure that the sensitive env vars exist */
require('module-alias/register')

import 'source-map-support/register'

import config from '@core/config'
import { loaders } from '@core/loaders'
import { addTransport } from '@core/logger'
import { getHttpLogTransportOpts } from '@shared/tracing'
import { transports } from 'winston'

config.validate()
addTransport(new transports.Http(getHttpLogTransportOpts()))

const start = async (): Promise<void> => {
  await loaders()
}

start().catch((err) => {
  console.error(err)
})
