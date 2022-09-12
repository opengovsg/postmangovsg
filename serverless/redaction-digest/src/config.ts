import convict from 'convict'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

const rdsCa = fs.readFileSync(path.join(__dirname, './assets/db-ca.pem'))

dotenv.config()

/**
 * To require an env var without setting a default,
 * use
 *    default: '',
 *    format: 'required-string',
 *    sensitive: true,
 */
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
    doc: 'The application environment',
    format: ['production', 'staging', 'development'],
    default: 'production',
    env: 'NODE_ENV',
  },
  frontendUrl: {
    doc: 'Frontend base URL for links to campaigns',
    default: 'https://postman.gov.sg', // prod only
    env: 'FRONTEND_URL',
  },
  database: {
    databaseUri: {
      doc: 'URI to the postgres database',
      default: '',
      env: 'DB_URI',
      format: 'required-string',
      sensitive: true,
    },
    databaseReadReplicaUri: {
      doc: 'URI to the postgres read replica database',
      default: '',
      env: 'DB_READ_REPLICA_URI',
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
        doc: 'Number of milliseconds to try getting a connection from the pool before throwing error',
        default: 600000,
        env: 'SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS',
        format: 'int',
      },
      connectionTimeoutMillis: {
        doc: 'Number of milliseconds to wait before timing out when connecting a new client',
        default: 30000,
        env: 'SEQUELIZE_POOL_CONNECTION_TIMEOUT',
        format: 'int',
      },
    },
    useIam: {
      doc: 'Whether to use IAM for authentication to database',
      default: true,
      env: 'DB_USE_IAM',
    },
  },
  mailOptions: {
    host: {
      doc: 'Amazon SES SMTP endpoint.',
      default: '',
      env: 'SES_HOST',
      format: 'required-string',
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
        format: 'required-string',
      },
      pass: {
        doc: 'SMTP password',
        default: '',
        env: 'SES_PASS',
        sensitive: true,
        format: 'required-string',
      },
    },
    callbackHashSecret: {
      doc: 'Callback secret for email',
      default: '',
      env: 'EMAIL_CALLBACK_HASH_SECRET',
      format: 'required-string',
    },
  },
  mailFrom: {
    doc: 'The email address that appears in the From field of an email',
    default: '',
    env: 'SES_FROM',
  },
  sentryDsn: {
    doc: 'Sentry DSN for serverless',
    default: '',
    env: 'SENTRY_DSN',
    format: 'required-string',
  },
  cronitor: {
    code: {
      doc: 'Unique cronitor code',
      default: '',
      env: 'CRONITOR_CODE',
    },
  },
  aws: {
    awsRegion: {
      doc: 'Region for where the lambda will be deployed in.',
      default: 'ap-southeast-1',
      env: 'AWS_REGION',
    },
  },
  noticePeriod: {
    doc: 'Number of days ahead to notify users of redaction',
    default: 7,
    format: Number,
    env: 'NOTICE_PERIOD',
  },
  retentionPeriod: {
    doc: 'Number of days to keep campaign before redacting',
    default: 30,
    format: Number,
    env: 'RETENTION_PERIOD',
  },
})

// If mailFrom was not set in an env var, set it using the app_name
const defaultMailFrom = 'Postman.gov.sg <donotreply@mail.postman.gov.sg>'
config.set('mailFrom', config.get('mailFrom') || defaultMailFrom)

// Override config for staging and development
switch (config.get('env')) {
  case 'staging':
    config.load({
      frontendUrl: 'https://staging.postman.gov.sg',
    })
    break
  case 'development':
    config.load({
      frontendUrl: 'http://localhost:3000',
      database: {
        useIam: false,
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

export default config
