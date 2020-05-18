/**
 * @file Configuration 
 * All defaults can be changed
 */
import convict from 'convict'
import fs from 'fs'
import path from 'path'
import getDomainValidator from './utils/get-domain-validator'

/**
 * To require an env var without setting a default,
 * use
 *    default: '',
 *    format: 'required-string',
 *    sensitive: true,
 */
convict.addFormats({
  'required-string': {
    validate:  (val: any): void => {
      if (val === '') {
        throw new Error('Required value cannot be empty')
      }
    },
    coerce: (val: any): any => { 
      if (val === null){
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
    default: 'development',
    env: 'NODE_ENV',
  },
  IS_PROD: {
    default: false,
  },
  APP_NAME: {
    doc: 'Name of the app',
    default: 'Postman.gov.sg',
    env: 'APP_NAME',
  },
  aws: {
    awsRegion: {
      doc: 'Region for the S3 bucket that is used to store file uploads',
      default:  'ap-northeast-1',
      env: 'AWS_REGION',
    },
    logGroupName: {
      doc: '	Name of Cloudwatch log group to write application logs to',
      default: 'postmangovsg-beanstalk-testing',
      env: 'AWS_LOG_GROUP_NAME',
    },
    uploadBucket: {
      doc: 'Name of the S3 bucket that is used to store file uploads',
      default:  'postmangovsg-dev-upload',
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
    dialectOptions: {
      ssl: {
        rejectUnauthorized: true,
        ca: {
          doc: 'SSL cert to connect to database',
          default: false,
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
  },
  jwtSecret: {
    doc: 'Secret used to sign pre-signed urls for uploading CSV files to AWS S3',
    default: '',
    env: 'JWT_SECRET',
    format: 'required-string',
    sensitive: true,
  },
  MORGAN_LOG_FORMAT: {
    doc: 'Format for logging requests to server',
    default: 'HTTP/:http-version :method :url :status :res[content-length] ":referrer" ":user-agent" :response-time ms; :date[iso]',
    env: 'MORGAN_LOG_FORMAT',
  },
  frontendUrl: {
    doc: 'CORS: accept requests from this origin. Can be a string, or regex',
    default: 'http://localhost:3000',
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
    cookieSettings:{
      httpOnly:{
        doc: 'Specifies the boolean value for the HttpOnly Set-Cookie attribute.',
        default: false,
        env: 'COOKIE_HTTP_ONLY',
      },
      secure:{
        doc: 'true will set a secure cookie that is sent only over HTTPS.',
        default: false,
        env: 'COOKIE_SECURE',
      },
      maxAge:{
        doc: 'Specifies the number (in milliseconds) to use when calculating the Expires Set-Cookie attribute',
        default: 24 * 60 * 60 * 1000,
        env: 'COOKIE_MAX_AGE',
        format: 'int',
      },
      sameSite:{
        doc: 'true will set the SameSite attribute to Strict for strict same site enforcement.',
        default: true,
        env: 'COOKIE_SAME_SITE',
      },
      domain:{
        doc: 'Specifies the value for the Domain Set-Cookie attribute',
        default: 'localhost',
        env: 'COOKIE_DOMAIN',
      },
      path:{
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
      sms:
    { 
      whiteList: { br: [] },
      stripIgnoreTag: true,
    },
    },
  },
})

// Both production and staging environments are considered as prod environments on AWS
config.set('IS_PROD', ['production', 'staging'].includes(config.get('env')))

// If mailFrom was not set in an env var, set it using the app_name
const defaultMailFrom =  `${config.get('APP_NAME')} <donotreply@mail.postman.gov.sg>`
config.set('mailFrom', config.get('mailFrom') ||  defaultMailFrom)

// Derive the DomainValidatorFunction from the list of domains supplied
config.set('validateDomain', getDomainValidator(config.get('domains')))

// If the environment is a prod environment, we must connect to the database with an ssl cert
const rdsCa = fs.readFileSync(path.join(__dirname, '../../assets/db-ca.pem')) 
config.set('database.dialectOptions.ssl.ca', config.get('IS_PROD') ? [rdsCa] : false)

// Override some defaults
switch (config.get('env')){
case 'production':
  config.load({
    frontendUrl: 'https://postman.gov.sg', // prod only
    aws: {
      uploadBucket:  'postmangovsg-prod-upload',
      logGroupName: 'postmangovsg-beanstalk-prod',
    },
    session: {
      cookieSettings: {
        httpOnly: true,
        secure: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: true,
        domain:  'postman.gov.sg', //root domain only
        path: '/',
      },
    },
  })
  break
case 'staging':
  config.load({
    frontendUrl: '/^https:\\/\\/([A-z0-9-]+\\.)?(postman\\.gov\\.sg)$/', // all subdomains
    aws: {
      uploadBucket:  'postmangovsg-dev-upload',
      logGroupName: 'postmangovsg-beanstalk-staging',
    },
    session: {
      cookieSettings: {
        httpOnly: true,
        secure: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: true,
        domain: '.postman.gov.sg', // all subdomains
        path: '/',
      },
    },
  })
  break
}

// Validate to make sure all the required env vars have been set
config.validate()

export default config