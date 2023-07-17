import { aws4Interceptor } from 'aws4-axios'
import axios from 'axios'
import { Config } from 'sst/node/config'

/*
- This cron job runs every day at 12AM UTC, i.e. 8AM SGT
- It picks up API keys that are expiring at exactly 28 days, 14 days, 3 days and 1 day from now
- DATE_TRUNC("day", valid_until) function round down the valid_until timestamp to the nearest day
- The cron job will send emails to the API key owners to remind them to renew their API keys
*/

export async function handler() {
  const client = axios.create({
    baseURL: Config.FUNCTION_URL,
  })
  const interceptor = aws4Interceptor({
    options: {
      region: 'ap-southeast-1',
      service: 'lambda',
    },
  })
  client.interceptors.request.use(interceptor)
  await client
    .get(
      // FUNCTION_URL already contains a forward slash /
      `2015-03-31/functions/${Config.FUNCTION_NAME}/invocations?Qualifier=${Config.FUNCTION_VERSION}`,
    )
    .catch((err) => {
      console.log(err)
      throw err
    })
}
