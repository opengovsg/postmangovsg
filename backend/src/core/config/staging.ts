/**
 * @file Non sensitive configuration that can be hard coded for a staging environment
 */

import fs from 'fs'
import path from 'path'

// Environment
const IS_PROD = true

// Database settings
const rdsCa = fs.readFileSync(path.join(__dirname, '../../assets/db-ca.pem'))

// Express session
const cookieDomain = 'staging.postman.gov.sg'
const cookieSettings = {
  httpOnly: true,
  secure: IS_PROD,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours,
  sameSite: true,
  domain: cookieDomain,
  path: '/',
}

// CORS settings
// Regex to allow requests from all postman subdomains
const frontendUrl = '/^https:\\/\\/([A-z0-9-]+\\.)?(postman\\.gov\\.sg)$/'

// AWS Settings
const awsRegion = 'ap-northeast-1'
const uploadBucket = 'postmangovsg-dev-upload'
const logGroupName = 'postmangovsg-beanstalk-staging'

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