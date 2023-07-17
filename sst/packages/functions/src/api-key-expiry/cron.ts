// to replace with fetch when upgraded to Node 18
import axios from 'axios'
import { Config } from 'sst/node/config'

/*
- This cron job runs every day at 12AM UTC, i.e. 8AM SGT
- It picks up API keys that are expiring at exactly 28 days, 14 days, 3 days and 1 day from now
- DATE_TRUNC("day", valid_until) function round down the valid_until timestamp to the nearest day
- The cron job will send emails to the API key owners to remind them to renew their API keys
*/

export async function handler() {
  /* To try later
  https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-iam-policy-examples-for-api-execution.html
  https://docs.aws.amazon.com/lambda/latest/dg/API_Invoke.html
  */
  await axios
    .get(
      `${Config.FUNCTION_URL}2015-03-31/functions/${Config.FUNCTION_NAME}/invocations?Qualifier=${Config.FUNCTION_VERSION}`,
    )
    .catch((err) => {
      console.log(err)
    })
}
