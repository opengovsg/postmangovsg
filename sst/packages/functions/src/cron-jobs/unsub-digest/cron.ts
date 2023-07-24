import { Config } from 'sst/node/config'

import { lambdaInvokerWithCronitor } from '../lambda-invoker'

export async function handler() {
  const sendUnsubDigest = lambdaInvokerWithCronitor(
    Config.SEND_UNSUB_DIGEST_FUNCTION_URL,
    Config.SEND_UNSUB_DIGEST_FUNCTION_NAME,
    Config.SEND_UNSUB_DIGEST_FUNCTION_VERSION,
    Config.CRONITOR_CODE_UNSUB_DIGEST,
  )
  await sendUnsubDigest()
}
