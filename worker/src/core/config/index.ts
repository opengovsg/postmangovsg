import merge from 'lodash/merge' // Recursively merges from left to right, skipping undefined values
import defaultConfig from './default'
import stagingConfig from './staging'
import productionConfig from './production'
import envConfig from './env'

let config
const ENVIRONMENT = (process.env.ENVIRONMENT as string || 'production').toLowerCase()
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
  break 
}

export default {
  IS_PROD: config.IS_PROD,
  aws: {
    awsRegion: config.awsRegion,
    secretManagerSalt: config.secretManagerSalt,
    serviceName: config.serviceName,
    metadataUri: config.metadataUri,
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
  mailOptions: {
    host: config.mailHost,
    port: config.mailPort,
    auth: {
      user: config.mailUser,
      pass: config.mailPass,
    },
  },
  mailFrom: config.mailFrom,
  smsOptions: {
    accountSid: config.twilioAccountSid,
    apiKey: config.twilioApiKey,
    apiSecret: config.twilioApiSecret,
    messagingServiceSid: config.twilioMessagingServiceSid,
  },
  defaultCountryCode: config.defaultCountryCode,
  xssOptions: {
    email: config.xssOptionsEmail,
    sms: config.xssOptionsSms,
  },
  messageWorker: {
    numSender: config.numSender,
    numLogger: config.numLogger,
  },
}