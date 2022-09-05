// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
require('module-alias/register')

import config from '@core/config'
// Validate to make sure all the required env vars have been set
config.validate()

// This needs to be done before all traced packages (like express) 's imports
import '@shared/tracing'
