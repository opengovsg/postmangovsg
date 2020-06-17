/**
 * @file Configuration
 * All defaults can be changed
 */
import convict from 'convict'
import fs from 'fs'
import path from 'path'
const rdsCa = fs.readFileSync(path.join(__dirname, '../assets/db-ca.pem'))
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
    doc: 'The application environment.',
    format: ['production', 'staging', 'development'],
    default: 'production',
    env: 'NODE_ENV',
  },
  IS_PROD: {
    default: true,
  },
  APP_NAME: {
    doc: 'Name of the app',
    default: 'Postman.gov.sg',
    env: 'APP_NAME',
  },
  aws: {
    awsRegion: {
      doc: 'Region for the S3 bucket that is used to store file uploads',
      default: 'ap-northeast-1',
      env: 'AWS_REGION',
    },
    awsEndpoint: {
      doc:
        'The endpoint to send AWS requests to. If not specified, a default one is made with AWS_REGION',
      format: '*',
      default: null,
      env: 'AWS_ENDPOINT',
    },
    logGroupName: {
      doc: '	Name of Cloudwatch log group to write application logs to',
      default: 'postmangovsg-beanstalk-prod',
      env: 'AWS_LOG_GROUP_NAME',
    },
    uploadBucket: {
      doc: 'Name of the S3 bucket that is used to store file uploads',
      default: 'postmangovsg-prod-upload',
      env: 'FILE_STORAGE_BUCKET_NAME',
    },
    secretManagerSalt: {
      doc:
        'Secret used to generate names of credentials to be stored in AWS Secrets Manager',
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
  jwtSecret: {
    doc:
      'Secret used to sign pre-signed urls for uploading CSV files to AWS S3',
    default: '',
    env: 'JWT_SECRET',
    format: 'required-string',
    sensitive: true,
  },
  MORGAN_LOG_FORMAT: {
    doc: 'Format for logging requests to server',
    default:
      ':client-ip - :user-id [:date[iso]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
    env: 'MORGAN_LOG_FORMAT',
  },
  frontendUrl: {
    doc: 'CORS: accept requests from this origin. Can be a string, or regex',
    default: 'https//postman.gov.sg', // prod only
    env: 'FRONTEND_URL',
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
        doc:
          'Specifies the boolean value for the HttpOnly Set-Cookie attribute.',
        default: true,
        env: 'COOKIE_HTTP_ONLY',
      },
      secure: {
        doc: 'true will set a secure cookie that is sent only over HTTPS.',
        default: true,
        env: 'COOKIE_SECURE',
      },
      maxAge: {
        doc:
          'Specifies the number (in milliseconds) to use when calculating the Expires Set-Cookie attribute',
        default: 24 * 60 * 60 * 1000,
        env: 'COOKIE_MAX_AGE',
        format: 'int',
      },
      sameSite: {
        doc:
          'true will set the SameSite attribute to Strict for strict same site enforcement.',
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
      doc:
        'Number of attempts a user can enter otp before a new otp is required',
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
  defaultCountryCode: {
    doc: 'Country code to prepend to phone numbers',
    default: '65',
    env: 'DEFAULT_COUNTRY_CODE',
  },
  smsOptions: {
    accountSid: {
      doc: 'Id of the Twilio account',
      default: '',
      env: 'TWILIO_ACCOUNT_SID',
      sensitive: true,
    },
    apiKey: {
      doc: 'API Key to access Twilio',
      default: '',
      env: 'TWILIO_API_KEY',
      sensitive: true,
    },
    apiSecret: {
      doc: 'Corresponding API Secret to access Twilio',
      default: '',
      env: 'TWILIO_API_SECRET',
      sensitive: true,
    },
    messagingServiceSid: {
      doc: 'ID of the messaging service ',
      default: '',
      env: 'TWILIO_MESSAGING_SERVICE_SID',
      sensitive: true,
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
  xssOptions: {
    doc: 'List of html tags allowed',
    default: {
      email: {
        whiteList: {
          b: [],
          i: [],
          u: [],
          br: [],
          p: [],
          a: ['href', 'title', 'target'],
          img: ['src', 'alt', 'title', 'width', 'height'],
        },
        stripIgnoreTag: true,
      },
      sms: {
        whiteList: { br: [] },
        stripIgnoreTag: true,
      },
    },
  },
  csvProcessingTimeout: {
    doc:
      'Max duration for csv processing before timeout. Prevent campaigns from being stuck in csv processing state if server dies.',
    default: 10 * 60 * 1000, // 10 minutes
    env: 'CSV_PROCESSING_TIMEOUT_IN_MS',
    format: 'int',
  },
  sentryDsn: {
    doc: 'Sentry DSN for backend',
    default: '',
    env: 'SENTRY_DSN',
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
    config.set('IS_PROD', false)
    config.load({
      frontendUrl: 'http://localhost:3000',
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
