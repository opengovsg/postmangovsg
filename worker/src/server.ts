require('dotenv').config()
require('module-alias/register')
import config from '@core/config'
config.validate()

/*Load the app after we make sure that the sensitive env vars exist */
import 'source-map-support/register'
import { loaders } from '@core/loaders'
const start = async (): Promise<void> => {
  await loaders()
}

start().catch((err) => {
  console.error(err)
})
