/* eslint-disable  @typescript-eslint/no-var-requires */
require('dotenv').config()
require('module-alias/register')

import config from '@core/config'
import { RedisService } from '@core/services'
// Validate to make sure all the required env vars have been set
config.validate()
RedisService.init()
