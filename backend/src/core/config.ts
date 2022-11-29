/**
 * @file Configuration
 * All defaults can be changed
 */
import convict, { Config } from 'convict'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { isSupportedCountry } from 'libphonenumber-js'
const rdsCa = fs.readFileSync(path.join(__dirname, '../assets/db-ca.pem'))
/**
 * To require an env var without setting a default,
 * use
 *    default: '',
 *    format: 'required-string',
 *    sensitive: true,
 */

// NB ensure no naming clash with worker/src/core/config.ts as they share a single secrets set
interface ConfigSchema {
  env: string
  APP_NAME: string
  aws: {
    awsRegion: string
    awsEndpoint: null
    logGroupName: string
    uploadBucket: string
    secretManagerSalt: string
  }
  database: {
    databaseUri: string
    databaseReadReplicaUri: string
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
  }
  jwtSecret: string
  frontendUrl: string
  protectedUrl: string
  unsubscribeUrl: string
  session: {
    cookieName: string
    secret: string
    cookieSettings: {
      httpOnly: boolean
      secure: boolean
      maxAge: number
      sameSite: boolean
      domain: string
      path: string
    }
  }
  otp: {
    retries: number
    expiry: number
    resendTimeout: number
  }
  redisOtpUri: string
  redisSessionUri: string
  redisRateLimitUri: string
  redisCredentialUri: string
  mailOptions: {
    host: string
    port: number
    auth: {
      user: string
      pass: string
    }
    workerHost: string
  }
  mailFrom: string
  mailConfigurationSet: string
  mailVia: string
  mailDefaultRate: number
  transactionalEmail: {
    rate: number
    window: number
    bodySizeLimit: number
  }
  defaultCountry: string
  defaultCountryCode: string
  telegramOptions: {
    webhookUrl: string
  }
  maxRatePerJob: number
  apiKey: {
    salt: string
    version: string
  }
  domains: string
  sentryDsn: string
  unsubscribeHmac: {
    version: string
    v1: {
      algo: string
      key: string
    }
  }
  emailCallback: {
    minHaltNumber: number
    minHaltPercentage: number
    sendgridPublicKey: string
    callbackSecret: string
    hashSecret: string
  }
  smsCallback: {
    callbackSecret: string
  }
  telegramCallback: {
    contactUsUrl: string
    guideUrl: string
  }
  twilio: {
    usdToSgdRate: number
  }
  redaction: {
    maxAge: number
  }
  twilioCredentialCache: {
    maxAge: number
  }
  smsFallback: {
    activate: boolean
    senderId: string
  }
  emailFallback: {
    activate: boolean
  }
  defaultAgency: {
    name: string
  }
  showMastheadDomain: string
  upload: {
    redisUri: string
    queueName: string
    concurrency: number
    checkStalledInterval: number
  }
  file: {
    cloudmersiveKey: string
    maxAttachmentSize: number
    maxAttachmentNum: number
  }
}

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
  'float-percent': {
    validate: (val: any): void => {
      if (val !== 0 && (!val || val > 1 || val < 0)) {
        throw new Error('must be a float between 0 and 1, inclusive')
      }
    },
    coerce: (val: any): number => {
      return parseFloat(val)
    },
  },
})

const config: Config<ConfigSchema> = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'staging', 'development'],
    default: 'production',
    env: 'NODE_ENV',
  },
  APP_NAME: {
    doc: 'Name of the app',
    default: 'Postman.gov.sg',
    env: 'APP_NAME',
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
    logGroupName: {
      doc: 'Name of Cloudwatch log group to write application logs to',
      default: 'postmangovsg-beanstalk-prod',
      env: 'AWS_LOG_GROUP_NAME',
    },
    uploadBucket: {
      doc: 'Name of the S3 bucket that is used to store file uploads',
      default: 'postmangovsg-prod-upload',
      env: 'FILE_STORAGE_BUCKET_NAME',
    },
    secretManagerSalt: {
      doc: 'Secret used to generate names of credentials to be stored in AWS Secrets Manager',
      default: '',
      env: 'SECRET_MANAGER_SALT',
      format: 'required-string',
      sensitive: true,
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
  },
  jwtSecret: {
    doc: 'Secret used to sign pre-signed urls for uploading CSV files to AWS S3',
    default: '',
    env: 'JWT_SECRET',
    format: 'required-string',
    sensitive: true,
  },
  frontendUrl: {
    doc: 'CORS: accept requests from this origin. Can be a string, or regex',
    default: 'https://postman.gov.sg', // prod only
    env: 'FRONTEND_URL',
  },
  protectedUrl: {
    doc: 'Url domain and path for password-protected messages',
    default: 'https://postman.gov.sg/p', // prod only
    env: 'PROTECTED_URL',
  },
  unsubscribeUrl: {
    doc: 'Url domain and path for unsubscribe page',
    default: 'https://postman.gov.sg/unsubscribe', // prod only
    env: 'UNSUBSCRIBE_URL',
  },
  session: {
    cookieName: {
      doc: 'Identifier for the cookie',
      default: 'postmangovsg',
      env: 'COOKIE_NAME',
    },
    secret: {
      doc: 'Secret used to sign the session ID cookie',
      default: '',
      env: 'SESSION_SECRET',
      format: 'required-string',
      sensitive: true,
    },
    cookieSettings: {
      httpOnly: {
        doc: 'Specifies the boolean value for the HttpOnly Set-Cookie attribute.',
        default: true,
        env: 'COOKIE_HTTP_ONLY',
      },
      secure: {
        doc: 'true will set a secure cookie that is sent only over HTTPS.',
        default: true,
        env: 'COOKIE_SECURE',
      },
      maxAge: {
        doc: 'Specifies the number (in milliseconds) to use when calculating the Expires Set-Cookie attribute',
        default: 24 * 60 * 60 * 1000,
        env: 'COOKIE_MAX_AGE',
        format: 'int',
      },
      sameSite: {
        doc: 'true will set the SameSite attribute to Strict for strict same site enforcement.',
        default: true,
        env: 'COOKIE_SAME_SITE',
      },
      domain: {
        doc: 'Specifies the value for the Domain Set-Cookie attribute',
        default: 'postman.gov.sg', // only root domain
        env: 'COOKIE_DOMAIN',
      },
      path: {
        doc: 'Specifies the value for the Path Set-Cookie.',
        default: '/',
        env: 'COOKIE_PATH',
      },
    },
  },
  otp: {
    retries: {
      doc: 'Number of attempts a user can enter otp before a new otp is required',
      default: 4,
      env: 'OTP_RETRIES',
    },
    expiry: {
      doc: 'Number of seconds before a new otp is required',
      default: 600,
      env: 'OTP_EXPIRY_SECONDS',
    },
    resendTimeout: {
      doc: 'Number of seconds to wait before resending otp',
      default: 30,
      env: 'OTP_RESEND_SECONDS',
    },
  },
  redisOtpUri: {
    doc: 'URI to the redis cache for storing one time passwords',
    default: '',
    env: 'REDIS_OTP_URI',
    format: 'required-string',
    sensitive: true,
  },
  redisSessionUri: {
    doc: 'URI to the redis cache for storing login sessions',
    default: '',
    env: 'REDIS_SESSION_URI',
    format: 'required-string',
    sensitive: true,
  },
  redisRateLimitUri: {
    doc: 'URI to the redis cache for rate limiting transactional requests',
    default: '',
    env: 'REDIS_RATE_LIMIT_URI',
    format: 'required-string',
    sensitive: true,
  },
  redisCredentialUri: {
    doc: 'URI to the redis cache for storing credentials',
    default: '',
    env: 'REDIS_CREDENTIAL_URI',
    format: 'required-string',
    sensitive: true,
  },
  mailOptions: {
    host: {
      doc: 'Amazon SES SMTP endpoint used by backend to send emails (e.g. OTPs, API emails)',
      default: '',
      env: 'BACKEND_SES_HOST',
      format: 'required-string',
    },
    port: {
      doc: 'Amazon SES SMTP port, defaults to 465',
      default: 465,
      env: 'BACKEND_SES_PORT',
      format: 'int',
    },
    auth: {
      user: {
        doc: 'SMTP username',
        default: '',
        env: 'BACKEND_SES_USER',
        format: 'required-string',
        sensitive: true,
      },
      pass: {
        doc: 'SMTP password',
        default: '',
        env: 'BACKEND_SES_PASS',
        format: 'required-string',
        sensitive: true,
      },
    },
    workerHost: {
      doc: 'Amazon SES SMTP endpoint used by workers to send emails (e.g. campaign emails)',
      default: '',
      env: 'WORKER_SES_HOST',
      format: 'required-string',
    },
  },
  mailFrom: {
    doc: 'The email address that appears in the From field of an email',
    default: '',
    env: 'BACKEND_SES_FROM',
  },
  mailConfigurationSet: {
    doc: 'The configuration set specified when sending an email',
    default: 'postman-email-open',
    env: 'BACKEND_SES_CONFIGURATION_SET',
  },
  mailVia: {
    doc: 'Text to appended to custom sender name',
    default: 'via Postman',
    env: 'BACKEND_MAIL_VIA',
  },
  mailDefaultRate: {
    doc: 'The default rate at which an email campaign will be sent',
    default: 225,
    env: 'EMAIL_DEFAULT_RATE',
    format: 'int',
  },
  transactionalEmail: {
    rate: {
      doc: 'The max number of transactional emails that can be requested per window per user',
      default: 10,
      env: 'TRANSACTIONAL_EMAIL_RATE',
      format: 'int',
    },
    window: {
      doc: 'The duration of each window for transactional emails in seconds.',
      default: 1,
      env: 'TRANSACTIONAL_EMAIL_WINDOW',
      format: 'int',
    },
    bodySizeLimit: {
      doc: 'The maximum size of the body of a transactional email in bytes',
      default: 1048576, // 1 mebibyte; 2^20 bytes
      env: 'TRANSACTIONAL_EMAIL_BODY_SIZE_LIMIT_BYTES',
      format: 'int',
    },
  },
  defaultCountry: {
    doc: 'Two-letter ISO country code to use in libphonenumber-js',
    default: 'SG',
    env: 'DEFAULT_COUNTRY',
    format: (countryCode: string): boolean => {
      return isSupportedCountry(countryCode)
    },
  },
  defaultCountryCode: {
    doc: 'Country code to prepend to phone numbers',
    default: '65',
    env: 'DEFAULT_COUNTRY_CODE',
  },
  telegramOptions: {
    webhookUrl: {
      doc: 'Webhook URL to configure for all Telegram bots',
      default: '',
      env: 'TELEGRAM_WEBHOOK_URL',
    },
  },
  maxRatePerJob: {
    doc: 'Number of messages that one worker can send at a time',
    default: 150,
    env: 'MAX_RATE_PER_JOB',
    format: 'int',
  },
  apiKey: {
    salt: {
      doc: 'Secret used to hash API Keys before storing them in the database',
      default: '',
      env: 'API_KEY_SALT_V1',
      format: 'required-string',
      sensitive: true,
    },
    version: {
      doc: 'Version of salt, defaults to v1',
      default: 'v1',
      env: 'API_KEY_SALT_VERSION',
    },
  },
  domains: {
    doc: 'Semi-colon separated list of domains that can sign in to the app.',
    default: '.gov.sg',
    env: 'DOMAIN_WHITELIST',
  },
  sentryDsn: {
    doc: 'Sentry DSN for backend',
    default: '',
    env: 'SENTRY_DSN',
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
    minHaltNumber: {
      doc: 'Halt if there is this minimum number of invalid recipients, and it exceeds the percentage threshold',
      default: 10,
      env: 'MIN_HALT_NUMBER',
      format: 'int',
    },
    minHaltPercentage: {
      doc: 'Halt if the percentage of invalid recipients exceeds this threshold. Supply a float from 0 to 1',
      default: 0.1,
      env: 'MIN_HALT_PERCENTAGE',
      format: 'float-percent',
    },
    sendgridPublicKey: {
      doc: 'Public key used to verify webhook events from sendgrid',
      env: 'SENDGRID_PUBLIC_KEY',
      default: '',
      format: 'required-string',
    },
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
  smsCallback: {
    callbackSecret: {
      doc: 'Secret used to generate the basic auth credentials for twilio callback',
      default: '',
      env: 'TWILIO_CALLBACK_SECRET',
      format: 'required-string',
      sensitive: true,
    },
  },
  telegramCallback: {
    contactUsUrl: {
      doc: 'URL to contact form',
      default: '',
      env: 'TELEGRAM_BOT_CONTACT_US_URL',
      format: 'required-string',
    },
    guideUrl: {
      doc: 'URL to recipient guide',
      default: '',
      env: 'TELEGRAM_BOT_GUIDE_URL',
      format: 'required-string',
    },
  },
  twilio: {
    // for future extension: fetch via API
    usdToSgdRate: {
      doc: 'Rate of USD to SGD',
      default: 1.4,
      env: 'USD_TO_SGD_RATE',
      format: Number,
    },
  },
  redaction: {
    maxAge: {
      doc: 'Maximum age before campaign is redacted',
      default: 30,
      env: 'REDACTION_MAXIMUM_AGE',
      format: Number,
    },
  },
  twilioCredentialCache: {
    maxAge: {
      doc: 'Maximum age of an item in milliseconds',
      default: 24 * 60 * 60 * 1000, // 1 day,
      env: 'TWILIO_CREDENTIAL_CACHE_MAX_AGE',
      format: 'int',
    },
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
  defaultAgency: {
    name: {
      doc: 'Default agency name used for users from unrecognised domains',
      default: 'Singapore Government',
      env: 'DEFAULT_AGENCY_NAME',
    },
  },
  showMastheadDomain: {
    doc: 'Show masthead within email template if logged-in user has email ending with this domain',
    default: '.gov.sg',
    env: 'SHOW_MASTHEAD_DOMAIN',
  },
  upload: {
    redisUri: {
      doc: 'URI to the redis database for recipient list upload job queue',
      default: '',
      env: 'REDIS_UPLOAD_URI',
      format: 'required-string',
      sensitive: true,
    },
    queueName: {
      doc: 'Name of queue used to store upload jobs',
      default: 'uploads',
      env: 'UPLOAD_QUEUE_NAME',
    },
    concurrency: {
      doc: 'Maximum number of simultaneous active jobs',
      default: 3,
      env: 'UPLOAD_CONCURRENCY',
      format: Number,
    },
    checkStalledInterval: {
      doc: 'How often to check for stalled jobs in milliseconds',
      default: 5000,
      env: 'UPLOAD_CHECK_STALLED_INTERVAL',
      format: Number,
    },
  },
  file: {
    cloudmersiveKey: {
      doc: 'API key for Cloudmersive file scanning service',
      default: '',
      env: 'FILE_CLOUDMERSIVE_KEY',
      format: 'required-string',
      sensitive: true,
    },
    maxAttachmentSize: {
      doc: 'Maximum accepted file attachment size in MB',
      default: 2 * 1024 * 1024, // 2MB, i.e. limit set in docs/api-usage.md
      env: 'FILE_ATTACHMENT_MAX_SIZE',
      format: Number,
    },
    maxAttachmentNum: {
      doc: 'Maximum number of file attachments',
      default: 2, // limit set in docs/api-usage.md
      env: 'FILE_ATTACHMENT_MAX_NUM',
      format: Number,
    },
  },
})

// If mailFrom was not set in an env var, set it using the app_name
const defaultMailFrom = `${config.get(
  'APP_NAME'
)} <donotreply@mail.postman.gov.sg>`
config.set('mailFrom', config.get('mailFrom') || defaultMailFrom)

// Override some defaults
switch (config.get('env')) {
  case 'staging':
    config.load({
      frontendUrl: '/^https:\\/\\/([A-z0-9-]+\\.)?(postman\\.gov\\.sg)$/', // all subdomains
      protectedUrl: 'https://staging.postman.gov.sg/p',
      unsubscribeUrl: 'https://staging.postman.gov.sg/unsubscribe',
      aws: {
        uploadBucket: 'postmangovsg-dev-upload',
        logGroupName: 'postmangovsg-beanstalk-staging',
      },
      session: {
        cookieSettings: {
          httpOnly: true,
          secure: true, // Can only be sent via https
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: true,
          domain: '.postman.gov.sg', // all subdomains
          path: '/',
        },
      },
    })
    break
  case 'development':
    config.load({
      frontendUrl: 'http://localhost:3000',
      protectedUrl: 'http://localhost:3000/p',
      unsubscribeUrl: 'http://localhost:3000/unsubscribe',
      aws: {
        uploadBucket: 'postmangovsg-dev-upload',
        logGroupName: 'postmangovsg-beanstalk-testing',
      },
      database: {
        dialectOptions: {
          ssl: {
            require: false, // No ssl connection needed
            rejectUnauthorized: true,
            ca: false,
          },
        },
      },
      session: {
        cookieSettings: {
          httpOnly: true,
          secure: false,
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: true,
          domain: 'localhost',
          path: '/',
        },
      },
    })
    break
}

export default config
