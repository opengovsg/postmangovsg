import fs from 'fs'
import path from 'path'

const IS_PROD: boolean = process.env.NODE_ENV === 'production'

// AWS settings
const awsRegion: string = process.env.AWS_REGION as string
const uploadBucket: string = process.env.FILE_STORAGE_BUCKET_NAME as string

// Database settings
const databaseUri: string = process.env.DB_URI as string
const SEQUELIZE_POOL_MAX_CONNECTIONS = 150
const SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS = 600000
const rdsCa = IS_PROD && fs.readFileSync(path.join(__dirname, '../db-ca.pem'))

const redisOtpUri = process.env.REDIS_OTP_URI as string
const redisSessionUri = process.env.REDIS_SESSION_URI as string

const MORGAN_LOG_FORMAT = 'HTTP/:http-version :method :url :status :res[content-length] ":referrer" ":user-agent" :response-time ms; :date[iso]'

// Express session
const sessionSecret: string = process.env.SESSION_SECRET as string
const cookieSettings = {
  httpOnly: true,
  secure: IS_PROD,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours,
  sameSite: true,
}

// Node mailer
const mailHost = process.env.MAIL_HOST as string
const mailPort = process.env.MAIL_PORT as string
const mailUser = process.env.MAIL_USER as string
const mailPassword = process.env.MAIL_PASSWORD as string

export default {
  IS_PROD,
  aws: {
    awsRegion,
    uploadBucket,
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
  MORGAN_LOG_FORMAT,
  session: {
    secret: sessionSecret,
    cookieSettings,
  },
  redisOtpUri,
  redisSessionUri,
  mailOptions:{
    host: mailHost,
    port: mailPort,
    auth: {
      user: mailUser,
      pass: mailPassword,
    },
  }
}