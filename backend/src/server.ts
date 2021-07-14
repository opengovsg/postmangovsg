import './setup'

/** Load the app after all env vars are set */
import 'source-map-support/register'
import express from 'express'
import { loaders } from '@core/loaders'
const port = Number(process.env.PORT) || 4000
const app: express.Application = express()

const start = async (): Promise<void> => {
  await loaders({ app })
  const server = app.listen(port, () =>
    // eslint-disable-next-line no-console
    console.log(`Listening on port ${port}!`)
  )

  // Set the keepAliveTimeout to be greater than ALB and nginx's timeout settings to
  // prevent race condition where a connection that is being reused is closed at the
  // same time by node, resulting in a connection reset error.
  server.keepAliveTimeout = 110 * 1000
}

start().catch((err) => {
  console.error(err)
})
