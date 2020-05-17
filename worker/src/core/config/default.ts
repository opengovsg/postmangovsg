/**
 * @file Non sensitive configuration that can be hard coded for a development environment
 */
// App name
const APP_NAME = 'Postman.gov.sg'

// Environment
const IS_PROD = false

// Database settings
const SEQUELIZE_POOL_MAX_CONNECTIONS = 150
const SEQUELIZE_POOL_MIN_CONNECTIONS = 0
const SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS = 600000
const rdsCa = false

// AWS Settings
const awsRegion = 'ap-northeast-1'

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

  
// Node mailer
const mailPort = 465
const mailFrom = `${APP_NAME} <donotreply@mail.postman.gov.sg>`

// Twilio
const defaultCountryCode = '65'

export default {
  APP_NAME,
  IS_PROD,
  SEQUELIZE_POOL_MAX_CONNECTIONS,
  SEQUELIZE_POOL_MIN_CONNECTIONS,
  SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS,
  rdsCa,
  awsRegion,
  xssOptionsEmail,
  xssOptionsSms,
  mailPort,
  mailFrom,
  defaultCountryCode,
}