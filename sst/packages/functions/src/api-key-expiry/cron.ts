// to replace with fetch when upgraded to Node 18
import axios from 'axios'
import { Config } from 'sst/node/config'

import { IS_LOCAL } from '../env'
/*
- This cron job runs every day at 12AM UTC, i.e. 8AM SGT
- It picks up API keys that are expiring at exactly 28 days, 14 days, 3 days and 1 day from now
- DATE_TRUNC("day", valid_until) function round down the valid_until timestamp to the nearest day
- The cron job will send emails to the API key owners to remind them to renew their API keys
*/

export async function handler() {
  const apiEndpoint = IS_LOCAL ? Config.API_ENDPOINT : 'todolater'
  console.log('apiEndpoint', apiEndpoint)
  await axios.get(`${apiEndpoint}/api-key-expiry`).catch((err) => {
    console.error(err)
    throw err
  })
}
