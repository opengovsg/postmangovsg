/**
 * @file Configuration
 * All defaults can be changed
 */
import convict from 'convict'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { isSupportedCountry } from 'libphonenumber-js'

const rdsCa = fs.readFileSync(path.join(__dirname, '../assets/db-ca.pem'))

convict.addFormats({
  'required-string': {
    validate: (val: any): void => {
      if (val === '') {
        throw new Error('Required value cannot be empty')
      }
    },
    coerce: (val: any): any => {
      if (val === null) {
        return undefined
      }
      return val
    },
  },
})

const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'staging', 'development', 'test'],
    default: 'production',
    env: 'NODE_ENV',
  },
  aws: {
    awsRegion: {
      doc: 'Region for the S3 bucket that is used to store file uploads',
      default: 'ap-southeast-1',
      env: 'AWS_REGION',
    },
    awsEndpoint: {
      doc:
        'The endpoint to send AWS requests to. If not specified, a default one is made with AWS_REGION',
      format: '*',
      default: null,
      env: 'AWS_ENDPOINT',
    },
    secretManagerSalt: {
      doc:
        'Secret used to generate names of credentials to be stored in AWS Secrets Manager',
      default: '',
      env: 'SECRET_MANAGER_SALT',
      format: 'required-string',
      sensitive: true,
    },
    serviceName: {
      doc: 'ECS service name used for finding the existing running tasks',
      default: '',
      env: 'ECS_SERVICE_NAME',
      format: 'required-string',
    },
    metadataUri: {
      doc: 'URI injected by ECS Agent, do not set manually',
      default: '',
      env: 'ECS_CONTAINER_METADATA_URI_V4',
    },
  },
  database: {
    databaseUri: {
      doc: 'URI to the postgres database',
      default: '',
      env: 'DB_URI',
      format: 'required-string',
      sensitive: true,
    },
    dialectOptions: {
      ssl: {
        require: {
          doc: 'Require SSL connection to database',
          default: true,
          env: 'DB_REQUIRE_SSL',
        },
        rejectUnauthorized: true,
        ca: {
          doc: 'SSL cert to connect to database',
          default: [rdsCa],
          format: '*',
          sensitive: true,
        },
      },
    },
    poolOptions: {
      max: {
        doc: 'Maximum number of connection in pool',
        default: 150,
        env: 'SEQUELIZE_POOL_MAX_CONNECTIONS',
        format: 'int',
      },
      min: {
        doc: 'Minimum number of connection in pool',
        default: 0,
        env: 'SEQUELIZE_POOL_MIN_CONNECTIONS',
        format: 'int',
      },
      acquire: {
        doc:
          'The maximum time, in milliseconds, that pool will try to get connection before throwing error',
        default: 600000,
        env: 'SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS',
        format: 'int',
      },
    },
  },
  mailOptions: {
    host: {
      doc: 'Amazon SES SMTP endpoint.',
      default: '',
      env: 'SES_HOST',
    },
    port: {
      doc: 'Amazon SES SMTP port, defaults to 465',
      default: 465,
      env: 'SES_PORT',
      format: 'int',
    },
    auth: {
      user: {
        doc: 'SMTP username',
        default: '',
        env: 'SES_USER',
        sensitive: true,
      },
      pass: {
        doc: 'SMTP password',
        default: '',
        env: 'SES_PASS',
        sensitive: true,
      },
    },
  },
  mailFrom: {
    doc: 'The email address that appears in the From field of an email',
    default: '',
    env: 'SES_FROM',
  },
  defaultCountry: {
    doc: 'Two-letter ISO country code to use in libphonenumber-js',
    default: 'SG',
    env: 'DEFAULT_COUNTRY',
    format: (countryCode: string): boolean => {
      return isSupportedCountry(countryCode)
    },
  },
  smsOptions: {
    apiRoot: {
      doc: 'Twilio API root url',
      default: 'https://api.twilio.com',
      env: 'TWILIO_API_ROOT',
    },
  },
  telegramOptions: {
    apiRoot: {
      doc: 'Telegram API root url',
      default: 'https://api.telegram.org',
      env: 'TELEGRAM_API_ROOT',
    },
  },
  callbackSecret: {
    doc: 'Secret key used to generate Twilio callback url',
    default: '',
    env: 'TWILIO_CALLBACK_SECRET',
    sensitive: true,
  },
  backendUrl: {
    doc: 'URL where the callback backend is hosted',
    default: '',
    env: 'BACKEND_URL',
    sensitive: true,
  },
  messageWorker: {
    numSender: {
      doc: 'Number of sender workers',
      default: 0,
      env: 'MESSAGE_WORKER_SENDER',
      format: 'int',
    },
    numLogger: {
      doc: 'Number of logger workers',
      default: 0,
      env: 'MESSAGE_WORKER_LOGGER',
      format: 'int',
    },
  },
  unsubscribeHmac: {
    version: {
      doc: 'Version of unsubscribe HMAC options, defaults to v1',
      default: 'v1',
      format: ['v1'],
      env: 'UNSUBSCRIBE_HMAC_VERSION',
    },
    v1: {
      algo: {
        doc: 'V1 HMAC algorithm',
        default: '',
        format: crypto.getHashes(),
        env: 'UNSUBSCRIBE_HMAC_ALGO_V1',
      },
      key: {
        doc: 'V1 HMAC key',
        default: '',
        format: 'required-string',
        env: 'UNSUBSCRIBE_HMAC_KEY_V1',
        sensitive: true,
      },
    },
  },
  frontendUrl: {
    doc: 'Used to generate unsubscribe url',
    default: 'https://postman.gov.sg', // prod only
    env: 'FRONTEND_URL',
  },
})

// If mailFrom was not set in an env var, set it using the app_name
const defaultMailFrom = 'Postman.gov.sg <donotreply@mail.postman.gov.sg>'
config.set('mailFrom', config.get('mailFrom') || defaultMailFrom)

// Only development is a non-production environment
// Override with local config
const environment = config.get('env')
if (environment === 'development' || environment === 'test') {
  const channelOptionsOverrides =
    environment !== 'test'
      ? {}
      : {
          mailOptions: {
            host: 'localhost',
            port: 1025,
            auth: { user: 'user', pass: 'pass' },
          },
          telegramOptions: {
            apiRoot: 'http://localhost:1081',
          },
          smsOptions: {
            apiRoot: 'http://localhost:1082',
          },
        }

  config.load({
    frontendUrl: 'http://localhost:3000',
    database: {
      dialectOptions: {
        ssl: {
          require: false, // No ssl connection needed
          rejectUnauthorized: true,
          ca: false,
        },
      },
    },
    ...channelOptionsOverrides,
  })
}

if (config.get('env') === 'staging') {
  config.load({
    frontendUrl: 'https://staging.postman.gov.sg',
  })
}

// If the environment is a prod environment,
// we ensure that there is only 1 worker per ecs task,
// and required credentials are set
if (config.get('env') !== 'development') {
  if (
    config.get('messageWorker.numSender') +
      config.get('messageWorker.numLogger') !==
    1
  ) {
    throw new Error(`Only 1 worker of 1 variant per task supported in production.
    You supplied MESSAGE_WORKER_SENDER=${config.get('messageWorker.numSender')},
    MESSAGE_WORKER_LOGGER=${config.get('messageWorker.numLogger')}`)
  }

  // If a message worker is set, ensure that the credentials needed are also set
  if (config.get('messageWorker.numSender') > 0) {
    if (
      !config.get('mailOptions.host') ||
      !config.get('mailOptions.port') ||
      !config.get('mailOptions.auth.user') ||
      !config.get('mailOptions.auth.pass')
    ) {
      throw new Error(
        'Email credentials must be set since a sender worker is required'
      )
    }
  }
}

export default config
