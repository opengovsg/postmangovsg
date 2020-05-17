/**
 *  @file Use env vars to override any of the config variables
 */

/**
  * If value is not a valid number, return undefined
  * @param i string
  */
const parseEnvVarAsInt = (i: string): number | undefined => {
  const j = parseInt(i)
  return isNaN(j) ? undefined : j
}
  
/**
   *  If value is not defined, return undefined, otherwise, return the evaluated value
   * @param value 
   * @param valueIfDefined 
   */
const parseIfDefined = (value: string | undefined, valueIfDefined: string | boolean ): string | boolean | undefined => {
  return value === undefined ? undefined : valueIfDefined
} 

// App name
const APP_NAME = process.env.APP_NAME as string

// Environment
const IS_PROD = parseIfDefined(process.env.NODE_ENV, process.env.NODE_ENV === 'production')

// Database settings
const databaseUri: string = process.env.DB_URI as string
const SEQUELIZE_POOL_MAX_CONNECTIONS = parseEnvVarAsInt(process.env.SEQUELIZE_POOL_MAX_CONNECTIONS as string)
const SEQUELIZE_POOL_MIN_CONNECTIONS = parseEnvVarAsInt(process.env.SEQUELIZE_POOL_MIN_CONNECTIONS as string)
const SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS = parseEnvVarAsInt(process.env.SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS as string) 

// AWS settings
const awsRegion: string = process.env.AWS_REGION as string
const secretManagerSalt: string = process.env.SECRET_MANAGER_SALT as string

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
const defaultCountryCode: string = process.env.DEFAULT_COUNTRY_CODE as string

// Message workers
const numSender: number = parseEnvVarAsInt(process.env.MESSAGE_WORKER_SENDER as string) || 0
const numLogger: number = parseEnvVarAsInt(process.env.MESSAGE_WORKER_LOGGER as string) || 0
if (IS_PROD && (numSender + numLogger) !== 1) {
  throw new Error(`Only 1 worker of 1 variant per task supported in production. 
  You supplied MESSAGE_WORKER_SENDER=${numSender}, MESSAGE_WORKER_LOGGER=${numLogger}`)
}

// ECS
const serviceName: string = process.env.ECS_SERVICE_NAME as string // We have to specify this
const metadataUri: string = process.env.ECS_CONTAINER_METADATA_URI_V4 as string // This is injected by ecs agent

export default {
  APP_NAME,
  IS_PROD,
  databaseUri,
  SEQUELIZE_POOL_MAX_CONNECTIONS,
  SEQUELIZE_POOL_MIN_CONNECTIONS,
  SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS,
  awsRegion,
  secretManagerSalt,
  mailHost,
  mailPort,
  mailUser,
  mailPass,
  mailFrom,
  defaultCountryCode,
  twilioAccountSid,
  twilioApiKey,
  twilioApiSecret,
  twilioMessagingServiceSid,
  numSender,
  numLogger,
  serviceName,
  metadataUri,
}