/**
 *  @file Use env vars to override any of the config variables
 */
const parseEnvVarAsInt = (i: string): number | undefined => {
  const j = parseInt(i)
  return isNaN(j) ? undefined : j
}

// Environment
const IS_PROD = process.env.NODE_ENV !== undefined ? process.env.NODE_ENV === 'production' : undefined

// Database settings
const databaseUri: string = process.env.DB_URI as string
const SEQUELIZE_POOL_MAX_CONNECTIONS = parseEnvVarAsInt(process.env.SEQUELIZE_POOL_MAX_CONNECTIONS as string)
const SEQUELIZE_POOL_MIN_CONNECTIONS = parseEnvVarAsInt(process.env.SEQUELIZE_POOL_MIN_CONNECTIONS as string)
const SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS = parseEnvVarAsInt(process.env.SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS as string) 

// Cache settings
const redisOtpUri: string = process.env.REDIS_OTP_URI as string
const redisSessionUri: string = process.env.REDIS_SESSION_URI as string

// Express session
const sessionSecret: string = process.env.SESSION_SECRET as string
const cookieDomain: string = process.env.COOKIE_DOMAIN as string
const cookieSettings = {
  httpOnly: process.env.COOKIE_HTTP_ONLY,
  secure: process.env.COOKIE_SECURE === 'true',
  maxAge: parseEnvVarAsInt(process.env.COOKIE_MAX_AGE as string),
  sameSite: process.env.COOKIE_SAME_SITE === 'true',
  domain: cookieDomain,
  path:  process.env.COOKIE_PATH,
}

// CORS settings
const frontendUrl: string = process.env.FRONTEND_URL as string

// AWS Settings
const awsRegion: string = process.env.AWS_REGION as string
const uploadBucket: string = process.env.FILE_STORAGE_BUCKET_NAME as string
const secretManagerSalt: string = process.env.SECRET_MANAGER_SALT as string
const logGroupName: string = process.env.AWS_LOG_GROUP_NAME  as string

// Upload csv
const jwtSecret = process.env.JWT_SECRET as string

// OTP settings
const otpRetries = parseEnvVarAsInt(process.env.OTP_RETRIES as string) // Number of attempts to enter otp
const otpExpiry = parseEnvVarAsInt(process.env.OTP_EXPIRY_SECONDS as string) // Seconds before otp expires
const otpResendTimeout=  parseEnvVarAsInt(process.env.OTP_RESEND_SECONDS as string) // Number of seconds to wait before resending otp

// For API Key hashing 
const apiKeySalt: string = process.env.API_KEY_SALT_V1 as string
const apiKeyVersion = process.env.API_KEY_SALT_VERSION as string

// Node mailer
const mailHost: string = process.env.SES_HOST as string
const mailPort = parseEnvVarAsInt(process.env.SES_PORT as string) 
const mailUser: string = process.env.SES_USER as string
const mailPass: string = process.env.SES_PASS as string
const mailFrom: string = process.env.SES_FROM as string

// Twilio
const twilioAccountSid: string = process.env.TWILIO_ACCOUNT_SID as string
const twilioApiKey: string = process.env.TWILIO_API_KEY as string
const twilioApiSecret: string = process.env.TWILIO_API_SECRET as string
const twilioMessagingServiceSid: string = process.env.TWILIO_MESSAGING_SERVICE_SID as string

// Rate for job (any rate higher than this will be split)
const maxRatePerJob = parseEnvVarAsInt(process.env.MAX_RATE_PER_JOB as string)

// Domain whitelist
// list of domains split by semicolon
// .gov.sg;@moe.edu.sg will allow any emails @<agency>.gov.sg and @moe.edu.sg
const domains = process.env.DOMAIN_WHITELIST as string 

export default {
  IS_PROD,
  databaseUri,
  SEQUELIZE_POOL_MAX_CONNECTIONS,
  SEQUELIZE_POOL_MIN_CONNECTIONS,
  SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS,
  redisOtpUri,
  redisSessionUri,
  sessionSecret,
  cookieDomain,
  cookieSettings,
  frontendUrl,
  awsRegion,
  uploadBucket,
  secretManagerSalt,
  logGroupName,
  jwtSecret,
  otpRetries,
  otpExpiry,
  otpResendTimeout,
  apiKeySalt,
  apiKeyVersion,
  mailHost,
  mailPort,
  mailUser,
  mailPass,
  mailFrom,
  twilioAccountSid,
  twilioApiKey,
  twilioApiSecret,
  twilioMessagingServiceSid,
  maxRatePerJob,
  domains,
}