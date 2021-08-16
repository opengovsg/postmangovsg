require('dotenv').config()
require('module-alias/register')

import config from '@core/config'
// Validate to make sure all the required env vars have been set
config.validate()
