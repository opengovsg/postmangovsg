
/**
 * @file Non sensitive configuration that can be hard coded for a development environment
 */

// Environment
const IS_PROD = false

// Database settings
const SEQUELIZE_POOL_MAX_CONNECTIONS = 150
const SEQUELIZE_POOL_MIN_CONNECTIONS = 0
const SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS = 600000
const rdsCa = false

// Express session
const cookieDomain = 'localhost'
const cookieSettings = {
  httpOnly: true,
  secure: IS_PROD,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours,
  sameSite: true,
  domain: cookieDomain,
  path: '/',
}

// CORS settings
const frontendUrl = 'http://localhost:3000'

// AWS Settings
const awsRegion = 'ap-northeast-1'
const uploadBucket = 'postmangovsg-dev-upload'
const logGroupName = 'postmangovsg-beanstalk-testing'

// OTP settings
const otpRetries = 4 // Number of attempts to enter otp
const otpExpiry = 600 // in seconds, expires after 10 minutes
const otpResendTimeout = 30 // Number of seconds to wait before resending otp

// XSS whitelist
const xssOptionsEmail = {
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
}
const xssOptionsSms = {
  whiteList: { br: [] },
  stripIgnoreTag: true,
}

// For API Key hashing 
const apiKeyVersion = 'v1'

// Node mailer
const mailPort = 465
const mailFrom = 'Postman.gov.sg <donotreply@mail.postman.gov.sg>'

// Twilio
const defaultCountryCode = '65'

// Rate for job (any rate higher than this will be split)
const maxRatePerJob = 150 

// Constant format for logging
const MORGAN_LOG_FORMAT = 'HTTP/:http-version :method :url :status :res[content-length] ":referrer" ":user-agent" :response-time ms; :date[iso]'


export default {
  IS_PROD,
  SEQUELIZE_POOL_MAX_CONNECTIONS,
  SEQUELIZE_POOL_MIN_CONNECTIONS,
  SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS,
  rdsCa,
  cookieDomain,
  cookieSettings,
  frontendUrl,
  awsRegion,
  uploadBucket,
  logGroupName,
  otpRetries,
  otpExpiry,
  otpResendTimeout,
  xssOptionsEmail,
  xssOptionsSms,
  maxRatePerJob,
  apiKeyVersion,
  mailPort,
  mailFrom,
  defaultCountryCode,
  MORGAN_LOG_FORMAT,
}