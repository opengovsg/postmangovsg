import fs from 'fs'
import path from 'path'

const parseEnvVarAsInt = (i: string): number | undefined => {
  const j = parseInt(i)
  return isNaN(j) ? undefined : j
}

const IS_PROD: boolean = process.env.NODE_ENV === 'production'

// Message workers
const numSender: number = parseEnvVarAsInt(process.env.MESSAGE_WORKER_SENDER as string) || 0
const numLogger: number = parseEnvVarAsInt(process.env.MESSAGE_WORKER_LOGGER as string) || 0
if(IS_PROD && (numSender + numLogger) !== 1){
  throw new Error(`Only 1 worker of 1 variant per task supported in production. 
  You supplied MESSAGE_WORKER_SENDER=${numSender}, MESSAGE_WORKER_LOGGER=${numLogger}`)
}

// AWS settings
const awsRegion: string = process.env.AWS_REGION as string
const secretManagerSalt: string = process.env.SECRET_MANAGER_SALT as string

// Database settings
const databaseUri: string = process.env.DB_URI as string
const SEQUELIZE_POOL_MAX_CONNECTIONS = 150
const SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS = 600000
const rdsCa: false | Buffer = IS_PROD && fs.readFileSync(path.join(__dirname, '../assets/db-ca.pem'))

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



export default {
  IS_PROD,
  aws: {
    awsRegion,
    secretManagerSalt,
  },
  database: {
    databaseUri,
    dialectOptions: {
      ssl: {
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
  mailOptions:{
    host: mailHost,
    port: mailPort,
    auth: {
      user: mailUser,
      pass: mailPass,
    },
  },
  smsOptions: {
    accountSid: twilioAccountSid,
    apiKey: twilioApiKey,
    apiSecret: twilioApiSecret,
    messagingServiceSid: twilioMessagingServiceSid,
  },
  messageWorker: {
    numSender,
    numLogger,
  },
}