import fs from 'fs'
import path from 'path'

const IS_PROD: boolean = process.env.NODE_ENV === 'production'

// Database settings
const databaseUri: string = process.env.DB_URI as string
const SEQUELIZE_POOL_MAX_CONNECTIONS = 150
const SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS = 600000
const rdsCa: false | Buffer = IS_PROD && fs.readFileSync(path.join(__dirname, '../assets/db-ca.pem'))

// Twilio
const twilioCallbackSecret: string = process.env.TWILIO_CALLBACK_SECRET as string
const backendUrl: string = process.env.BACKEND_URL as string

export default {
  IS_PROD,
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
  smsOptions: {
    callbackSecret: twilioCallbackSecret,
    callbackBackendUrl: backendUrl
  },
}