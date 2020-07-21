import 'source-map-support/register'
import { Sequelize } from 'sequelize-typescript'
import * as Sentry from '@sentry/node'

import config from './config'
import { parseEvent } from './parser'
import sequelizeLoader from './sequelize-loader'
import { verifyBotIdRegistered } from './credentials'
import { handleUpdate } from './bot'

Sentry.init({
  dsn: config.get('sentryDsn'),
  environment: config.get('env'),
})
Sentry.configureScope((scope) => {
  scope.setTag('lambda-function-name', config.get('sentryLambdaFunctionName'))
})

let sequelize: Sequelize | undefined

const captureSentryException = async (err: Error, event: any) => {
  Sentry.captureException(err, (scope) => {
    // Enrich event with HTTP request method and payload
    scope.setContext('pathParameters', event.pathParameters)
    scope.addEventProcessor((sentryEvent) => ({
      ...sentryEvent,
      request: {
        method: event.httpMethod,
        data: event.body,
      },
    }))

    return scope
  })

  await Sentry.flush(2000)
}

const handler = async (event: any): Promise<{ statusCode: number }> => {
  try {
    if (!sequelize) {
      sequelize = await sequelizeLoader()
    }

    // Parse botToken and Telegram update
    const { botId, botToken, update } = parseEvent(event)

    // Verify botId
    await verifyBotIdRegistered(botId, sequelize)

    // Handle update
    await handleUpdate(botId, botToken, update, sequelize)
  } catch (err) {
    console.error(err)
    await captureSentryException(err, event)
  }

  return {
    statusCode: 200,
  }
}

export { handler }
