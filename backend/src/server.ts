import './setup'

/** Load the app after all env vars are set */
import 'source-map-support/register'
import express from 'express'
import { loaders } from '@core/loaders'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)
const port = Number(process.env.PORT) || 4000
const app: express.Application = express()

const start = async (): Promise<void> => {
  try {
    await loaders({ app })
    const server = app.listen(port, () =>
      // oxlint-disable-next-line no-console
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

// Log and keep serving, as the process did while Sentry's handler was registered.
// Without a listener, Node exits on an unhandled rejection.
process.on('unhandledRejection', (reason) => {
  logger.error({
    message: 'Unhandled promise rejection',
    error: reason,
    action: 'unhandledRejection',
  })
})

void start()
