import './setup'

/** Load the app after all env vars are set */
import 'source-map-support/register'
import express from 'express'
import { loaders } from '@core/loaders'
const port = Number(process.env.PORT) || 4000
const app: express.Application = express()

const start = async (): Promise<void> => {
  await loaders({ app })
  // eslint-disable-next-line no-console
  app.listen(port, () => console.log(`Listening on port ${port}!`))
}

start().catch((err) => {
  console.error(err)
})
