import { aws4Interceptor } from 'aws4-axios'
import axios from 'axios'
import { Config } from 'sst/node/config'

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
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cronitor = require('cronitor')(Config.CRONITOR_URL_SUFFIX)
  const invokeFunction = cronitor.wrap(
    Config.CRONITOR_CODE_API_KEY_EXPIRY,
    async function () {
      await client
        .get(
          // FUNCTION_URL already contains a forward slash /
          `2015-03-31/functions/${Config.FUNCTION_NAME}/invocations?Qualifier=${Config.FUNCTION_VERSION}`,
        )
        .catch((err) => {
          console.log(err)
          throw err
        })
    },
  )
  await invokeFunction()
}
