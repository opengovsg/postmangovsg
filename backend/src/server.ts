import './setup'

/** Load the app after all env vars are set */
import 'source-map-support/register'
import express from 'express'
import { loaders } from '@core/loaders'
import throng from 'throng'
const port = Number(process.env.PORT) || 8080
const app: express.Application = express()

const start = async (): Promise<void> => {
  try {
    await loaders({ app })
    const server = app.listen(port, () =>
      // eslint-disable-next-line no-console
      console.log(`Listening on port ${port}!`)
    )

    // Set the keepAliveTimeout to be greater than ALB and nginx's timeout settings to
    // prevent race condition where a connection that is being reused is closed at the
    // same time by node, resulting in a connection reset error.
    server.keepAliveTimeout = 110 * 1000
  } catch (err) {
    console.error(err)
  }
}

// Use throng to create a cluster and make full use of all the cores in underlying
// machine. The default counts is os.cpus().length
void throng({
  start,
})
