import fs from 'fs'
import path from 'path'
const parseEnvVarAsInt = (i: string): number | undefined => {
  const j = parseInt(i)
  return isNaN(j) ? undefined : j
}

const IS_PROD: boolean = process.env.NODE_ENV === 'production'

// AWS settings
const awsRegion: string = process.env.AWS_REGION as string
const uploadBucket: string = process.env.FILE_STORAGE_BUCKET_NAME as string
const secretManagerSalt: string = process.env.SECRET_MANAGER_SALT as string
const logGroupName: string = process.env.AWS_LOG_GROUP_NAME || 'postmangovsg-beanstalk-testing'

// Upload csv
const jwtSecret = process.env.JWT_SECRET as string

// Database settings
const databaseUri: string = process.env.DB_URI as string
const SEQUELIZE_POOL_MAX_CONNECTIONS = 150
const SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS = 600000
const rdsCa: false | Buffer = IS_PROD && fs.readFileSync(path.join(__dirname, '../assets/db-ca.pem'))

// Cache settings
const redisOtpUri: string = process.env.REDIS_OTP_URI as string
const redisSessionUri: string = process.env.REDIS_SESSION_URI as string

// Format for logging
const MORGAN_LOG_FORMAT = 'HTTP/:http-version :method :url :status :res[content-length] :remote-addr ":referrer" ":user-agent" :response-time ms; :date[iso]'

// CORS settings
const frontendUrl: string = process.env.FRONTEND_URL as string

// Express session
const sessionSecret: string = process.env.SESSION_SECRET as string
const cookieDomain: string = process.env.COOKIE_DOMAIN as string
const cookieSettings = {
  httpOnly: true,
  secure: IS_PROD,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours,
  sameSite: true,
  domain: cookieDomain,
  path: '/',
}

// OTP settings
const otpRetries = 4 // Number of attempts to enter otp
const otpExpiry = 600 // in seconds, expires after 10 minutes
const otpResendTimeout= 30 // Number of seconds to wait before resending otp


// Node mailer
const mailHost: string = process.env.SES_HOST as string
const mailPort = Number(process.env.SES_PORT)
const mailUser: string = process.env.SES_USER as string
const mailPass: string = process.env.SES_PASS as string

// Twilio
const twilioAccountSid: string = process.env.TWILIO_ACCOUNT_SID as string
const twilioApiKey: string = process.env.TWILIO_API_KEY as string
const twilioApiSecret: string = process.env.TWILIO_API_SECRET as string
const twilioMessagingServiceSid: string = process.env.TWILIO_MESSAGING_SERVICE_SID as string
const defaultCountryCode: string = process.env.DEFAULT_COUNTRY_CODE as string

// xss whitelist
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

// Rate for job (any rate higher than this will be split)
const maxRatePerJob = parseEnvVarAsInt(process.env.MAX_RATE_PER_JOB as string) || 150

// For API Key hashing
const apiKeySalt: string = process.env.API_KEY_SALT_V1 as string
const apiKeyVersion = 'v1'

export default {
  IS_PROD,
  aws: {
    awsRegion,
    logGroupName,
    uploadBucket,
    secretManagerSalt,
  },
  database: {
    databaseUri,
    dialectOptions: {
      ssl: {
        require: IS_PROD,
        rejectUnauthorized: true,
        ca: [rdsCa],
      },
    },
    poolOptions: {
      max: SEQUELIZE_POOL_MAX_CONNECTIONS,
      min: 0,
      acquire: SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS, // 10 min
    },
  },
  jwtSecret,
  MORGAN_LOG_FORMAT,
  frontendUrl,
  session: {
    secret: sessionSecret,
    cookieSettings,
  },
  otp: {
    retries: otpRetries,
    expiry: otpExpiry,
    resendTimeout: otpResendTimeout,
  },
  redisOtpUri,
  redisSessionUri,
  mailOptions:{
    host: mailHost,
    port: mailPort,
    auth: {
      user: mailUser,
      pass: mailPass,
    },
  },
  defaultCountryCode,
  smsOptions: {
    accountSid: twilioAccountSid,
    apiKey: twilioApiKey,
    apiSecret: twilioApiSecret,
    messagingServiceSid: twilioMessagingServiceSid,
  },
  xssOptions: {
    email: xssOptionsEmail,
    sms: xssOptionsSms,
  },
  maxRatePerJob,
  apiKey: {
    salt: apiKeySalt,
    version: apiKeyVersion,
  },
}