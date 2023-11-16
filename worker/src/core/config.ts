/**
 * @file Configuration
 * All defaults can be changed
 */
import convict, { Config } from 'convict'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

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

// NB ensure no naming clash with backend/src/core/config.ts as they share a single secrets set
export interface ConfigSchema {
  env: string
  aws: {
    awsRegion: string
    awsEndpoint: null
    secretManagerSalt: string
    serviceName: string
    metadataUri: string
  }
  database: {
    databaseUri: string
    dialectOptions: {
      ssl: {
        require: boolean
        rejectUnauthorized: {
          valueOf: any
        }
        ca: Buffer[]
      }
    }
    poolOptions: {
      max: number
      min: number
      acquire: number
    }
    useIam: boolean
    flamingoUri: string
  }
  mailOptions: {
    host: string
    port: number
    auth: { user: string; pass: string }
    callbackHashSecret: string
  }
  mailFrom: string
  mailConfigurationSet: string
  defaultCountry: string
  callbackSecret: string
  backendUrl: string
  messageWorker: { numSender: number; numLogger: number }
  unsubscribeHmac: { version: string; v1: { algo: string; key: string } }
  emailCallback: {
    callbackSecret: string
    hashSecret: string
  }
  unsubscribeUrl: string
  smsFallback: { activate: boolean; senderId: string }
  emailFallback: { activate: boolean }
  showMastheadDomain: string
  whatsapp: {
    namespace: string
    adminCredentialsOne: string
    adminCredentialsTwo: string
    onPremClientOneUrl: string
    onPremClientTwoUrl: string
    proxyToken: string
    proxyUrl: string
    authTokenOne: string
    authTokenOneExpiry: string
    authTokenTwo: string
    authTokenTwoExpiry: string
  }
  sgcCampaignAlertChannelWebhookUrl: string
}

const config: Config<ConfigSchema> = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'staging', 'development'],
    default: 'production',
    env: 'APP_ENV',
  },
  aws: {
    awsRegion: {
      doc: 'Region for the S3 bucket that is used to store file uploads',
      default: 'ap-southeast-1',
      env: 'AWS_REGION',
    },
    awsEndpoint: {
      doc: 'The endpoint to send AWS requests to. If not specified, a default one is made with AWS_REGION',
      format: '*',
      default: null,
      env: 'AWS_ENDPOINT',
    },
    secretManagerSalt: {
      doc: 'Secret used to generate names of credentials to be stored in AWS Secrets Manager',
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
        doc: 'The maximum time, in milliseconds, that pool will try to get connection before throwing error',
        default: 600000,
        env: 'SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS',
        format: 'int',
      },
    },
    useIam: {
      doc: 'Whether to use IAM for authentication to database',
      default: false,
      env: 'DB_USE_IAM',
    },
    flamingoUri: {
      doc: 'URI to the flamingo database',
      default: '',
      format: 'required-string',
      env: 'FLAMINGO_DB_URI',
    },
  },
  mailOptions: {
    host: {
      doc: 'Amazon SES SMTP endpoint used by workers to send emails (e.g. campaign emails)',
      default: '',
      env: 'WORKER_SES_HOST',
      format: 'required-string',
    },
    port: {
      doc: 'Amazon SES SMTP port, defaults to 465',
      default: 465,
      env: 'WORKER_SES_PORT',
      format: 'int',
    },
    auth: {
      user: {
        doc: 'SMTP username',
        default: '',
        env: 'WORKER_SES_USER',
        sensitive: true,
        format: 'required-string',
      },
      pass: {
        doc: 'SMTP password',
        default: '',
        env: 'WORKER_SES_PASS',
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
    env: 'WORKER_SES_FROM',
  },
  mailConfigurationSet: {
    doc: 'The configuration set specified when sending an email',
    default: 'postman-email-open',
    env: 'WORKER_SES_CONFIGURATION_SET',
  },
  defaultCountry: {
    doc: 'Two-letter ISO country code to use in libphonenumber-js',
    default: 'SG',
    env: 'DEFAULT_COUNTRY',
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
  emailCallback: {
    callbackSecret: {
      doc: 'Secret for basic auth',
      env: 'CALLBACK_SECRET',
      default: '',
    },
    hashSecret: {
      doc: 'Secret for email callback hash',
      env: 'EMAIL_CALLBACK_HASH_SECRET',
      default: '',
      format: 'required-string',
    },
  },
  unsubscribeUrl: {
    doc: 'Used to generate unsubscribe url',
    default: 'https://postman.gov.sg', // prod only
    env: 'UNSUBSCRIBE_URL',
  },
  smsFallback: {
    activate: {
      doc: 'Switch to true to use SNS fallback for all SMS campaigns',
      default: false,
      env: 'SMS_FALLBACK_ACTIVATE',
    },
    senderId: {
      doc: 'Sender ID to use for all SNS SMS',
      default: 'Postman',
      env: 'SMS_FALLBACK_SENDER_ID',
    },
  },
  emailFallback: {
    activate: {
      doc: 'Switch to true to use the SendGrid fallback for emails. Ensure that the SMTP settings are properly configured as well.',
      default: false,
      env: 'EMAIL_FALLBACK_ACTIVATE',
    },
  },
  showMastheadDomain: {
    doc: 'Show masthead within email template if logged-in user has email ending with this domain',
    default: '.gov.sg',
    env: 'SHOW_MASTHEAD_DOMAIN',
  },
  whatsapp: {
    adminCredentialsOne: {
      doc: 'Admin credentials for retrieving WhatsApp tokens for client 1',
      env: 'WA_ADMIN_CREDS_1',
      format: 'required-string',
      default: '',
    },
    adminCredentialsTwo: {
      doc: 'Admin credentials for retrieving WhatsApp tokens for client 2',
      env: 'WA_ADMIN_CREDS_2',
      format: 'required-string',
      default: '',
    },
    namespace: {
      doc: 'WhatsApp Account Namespace',
      env: 'WHATSAPP_NAMESPACE',
      format: 'required-string',
      default: '',
    },
    onPremClientOneUrl: {
      doc: 'Load balancer URL for WhatsApp On Prem Client 1',
      env: 'WHATSAPP_LB_URL_1',
      format: 'required-string',
      default: '',
    },
    onPremClientTwoUrl: {
      doc: 'Load balancer URL for WhatsApp On Prem Client 2',
      env: 'WHATSAPP_LB_URL_2',
      format: 'required-string',
      default: '',
    },
    proxyToken: {
      doc: 'Proxy token for accessing WhatsApp On Prem Client via proxy',
      env: 'WHATSAPP_PROXY_TOKEN',
      default: '',
    },
    proxyUrl: {
      doc: 'Proxy URL for accessing WhatsApp On Prem Client via proxy',
      env: 'WHATSAPP_PROXY_URL',
      default: '',
    },
    authTokenOne: {
      doc: 'WhatsApp Auth Token for client 1, for local dev only',
      env: 'WA_AUTH_TOKEN_1',
      default: '',
    },
    authTokenOneExpiry: {
      doc: 'WhatsApp Auth Token expiry for client 1, for local dev only',
      env: 'WA_AUTH_TOKEN_1_EXPIRY',
      default: '',
    },
    authTokenTwo: {
      doc: 'WhatsApp Auth Token for client 2, for local dev only',
      env: 'WA_AUTH_TOKEN_2',
      default: '',
    },
    authTokenTwoExpiry: {
      doc: 'WhatsApp Auth Token expiry for client 2, for local dev only',
      env: 'WA_AUTH_TOKEN_2_EXPIRY',
      default: '',
    },
  },
  sgcCampaignAlertChannelWebhookUrl: {
    doc: 'Slack webhook URL to post Gov.sg campaign alerts',
    env: 'SGC_CAMPAIGN_ALERT_WEBHOOK',
    default: '',
  },
})

// If mailFrom was not set in an env var, set it using the app_name
const defaultMailFrom = 'Postman.gov.sg <donotreply@mail.postman.gov.sg>'
config.set('mailFrom', config.get('mailFrom') || defaultMailFrom)

// Only development is a non-production environment
// Override with local config
if (config.get('env') === 'development') {
  config.load({
    unsubscribeUrl: 'http://localhost:3000',
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

if (config.get('env') === 'staging') {
  config.load({
    unsubscribeUrl: 'https://staging.postman.gov.sg',
  })
}

// Each worker process must be either a sender or logger but not both.
const numSender = config.get('messageWorker.numSender')
const numLogger = config.get('messageWorker.numLogger')

if (numSender < 1 && numLogger < 1 && process.env.NODE_ENV !== 'JEST') {
  throw new Error(`Worker must be either a sender or logger`)
}

if (numSender + numLogger !== 1 && process.env.NODE_ENV !== 'JEST') {
  throw new Error(`Only 1 worker of 1 variant per task supported in production.
		You supplied MESSAGE_WORKER_SENDER=${numSender}, MESSAGE_WORKER_LOGGER=${numLogger}`)
}

// If a message worker is set, ensure that the credentials needed are also set
if (numSender > 0) {
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

export default config
