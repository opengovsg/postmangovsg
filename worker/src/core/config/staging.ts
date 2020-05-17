/**
 * @file Non sensitive configuration that can be hard coded for a staging environment
 */
import fs from 'fs'
import path from 'path'

// Environment
const IS_PROD = true

// Database settings
const rdsCa = fs.readFileSync(path.join(__dirname, '../../assets/db-ca.pem'))

export default {
  IS_PROD,
  rdsCa,
}