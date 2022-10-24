// eslint-disable-next-line @typescript-eslint/no-var-requires
// This needs to be done before all traced packages (like express) 's imports
import '@shared/tracing'

import config from '@core/config'

require('dotenv').config()
require('module-alias/register')
// Validate to make sure all the required env vars have been set
config.validate()
