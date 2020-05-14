/**
 * @file Non sensitive configuration that can be hard coded for a production environment
 */

import fs from 'fs'
import path from 'path'

// Environment
const IS_PROD = true

// Database settings
const rdsCa = fs.readFileSync(path.join(__dirname, '../../assets/db-ca.pem'))

// Express session
const cookieDomain = 'postman.gov.sg'
const cookieSettings = {
  httpOnly: true,
  secure: IS_PROD,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours,
  sameSite: true,
  domain: cookieDomain,
  path: '/',
}

// CORS settings
const frontendUrl = 'https://postman.gov.sg'

// AWS Settings
const awsRegion = 'ap-northeast-1'
const uploadBucket = 'postmangovsg-prod-upload'
const logGroupName = 'postmangovsg-beanstalk-prod'

export default {
  IS_PROD,
  rdsCa,
  cookieDomain,
  cookieSettings,
  frontendUrl,
  awsRegion,
  uploadBucket,
  logGroupName,
}