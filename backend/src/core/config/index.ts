import merge from 'lodash/merge' // Recursively merges from left to right, skipping undefined values
import defaultConfig from './default'
import stagingConfig from './staging'
import productionConfig from './production'
import envConfig from './env'
import getDomainValidator from './utils/get-domain-validator'

let config
const ENVIRONMENT = (process.env.ENVIRONMENT as string || 'development').toLowerCase()
// The left-to-right order of merging is important
// as right will override left
switch (ENVIRONMENT) {
case 'staging':
  config = merge(defaultConfig, stagingConfig, envConfig)
  break
case 'production':
  config = merge(defaultConfig, productionConfig, envConfig)
  break
default:
  config = merge(defaultConfig, envConfig)
}

export default {
  APP_NAME: config.APP_NAME,
  IS_PROD: config.IS_PROD,
  aws: {
    awsRegion: config.awsRegion,
    logGroupName: config.logGroupName,
    uploadBucket: config.uploadBucket,
    secretManagerSalt: config.secretManagerSalt,
  },
  database: {
    databaseUri: config.databaseUri,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: true,
        ca: [config.rdsCa],
      },
    },
    poolOptions: {
      max: config.SEQUELIZE_POOL_MAX_CONNECTIONS,
      min: config.SEQUELIZE_POOL_MIN_CONNECTIONS,
      acquire: config.SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS, // 10 min
    },
  },
  jwtSecret: config.jwtSecret,
  MORGAN_LOG_FORMAT: config.MORGAN_LOG_FORMAT,
  frontendUrl: config.frontendUrl,
  session: {
    secret: config.sessionSecret,
    cookieSettings: config.cookieSettings,
  },
  otp: {
    retries: config.otpRetries,
    expiry: config.otpExpiry,
    resendTimeout: config.otpResendTimeout,
  },
  redisOtpUri: config.redisOtpUri,
  redisSessionUri: config.redisSessionUri,
  mailOptions: {
    host: config.mailHost,
    port: config.mailPort,
    auth: {
      user: config.mailUser,
      pass: config.mailPass,
    },
  },
  mailFrom: config.mailFrom,
  defaultCountryCode: config.defaultCountryCode,
  smsOptions: {
    accountSid: config.twilioAccountSid,
    apiKey: config.twilioApiKey,
    apiSecret: config.twilioApiSecret,
    messagingServiceSid: config.twilioMessagingServiceSid,
  },
  xssOptions: {
    email: config.xssOptionsEmail,
    sms: config.xssOptionsSms,
  },
  maxRatePerJob: config.maxRatePerJob,
  apiKey: {
    salt: config.apiKeySalt,
    version: config.apiKeyVersion,
  },
  validateDomain: getDomainValidator(config.domains),
}