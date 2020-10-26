const convict = require('convict')
require('dotenv').config()

/**
 * To require an env var without setting a default,
 * use
 *    default: '',
 *    format: 'required-string',
 *    sensitive: true,
 */
convict.addFormats({
  'required-string': {
    validate: (val) => {
      if (val === '') {
        throw new Error('Required value cannot be empty')
      }
    },
    coerce: (val) => {
      if (val === null) {
        return undefined
      }
      return val
    },
  },
})

const config = convict({
  env: {
    doc: 'The application environment',
    format: ['production', 'staging', 'development'],
    default: 'production',
    env: 'NODE_ENV',
  },
  sentryDsn: {
    doc: 'Sentry DSN for serverless',
    default: '',
    env: 'SENTRY_DSN',
    format: 'required-string',
  },
  slackWebhookUrl: {
    doc: 'Incoming webhook url for Slack notifications',
    default: '',
    env: 'SLACK_WEBHOOK_URL',
    format: 'required-string'
  }
})

// Only development is a non-production environment
// Override with local config
if (config.get('env') === 'development') {
  config.load({
    database: {
      dialectOptions: {
        ssl: {
          require: false, // No ssl connection needed
          rejectUnauthorized: true,
          ca: false,
        },
      },
    },
  })
}

config.validate({ allowed: 'strict' })

module.exports = config
