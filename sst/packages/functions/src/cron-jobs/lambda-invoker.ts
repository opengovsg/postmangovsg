import { aws4Interceptor } from 'aws4-axios'
import axios from 'axios'
import { Config } from 'sst/node/config'

export const lambdaInvokerWithCronitor = (
  functionUrl: string,
  functionName: string,
  functionVersion: string,
  cronitorCode: string, // specific to each cronitor job
): (() => Promise<void>) => {
  const client = axios.create({
    baseURL: functionUrl,
  })
  const interceptor = aws4Interceptor({
    options: {
      region: 'ap-southeast-1',
      service: 'lambda',
    },
  })
  client.interceptors.request.use(interceptor)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cronitor = require('cronitor')(Config.CRONITOR_URL_SUFFIX) // common to all jobs on our shared Cronitor account
  const invokeFunction = cronitor.wrap(cronitorCode, async function () {
    await client
      .get(
        // FUNCTION_URL already contains a forward slash /
        `2015-03-31/functions/${functionName}/invocations?Qualifier=${functionVersion}`,
      )
      .catch((err) => {
        console.log(err)
        throw err
      })
  })
  return invokeFunction
}
