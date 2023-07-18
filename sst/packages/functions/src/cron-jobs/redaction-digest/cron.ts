import { Config } from 'sst/node/config'

import { lambdaInvokerWithCronitor } from '../lambda-invoker'

export async function handler() {
  const sendRedactionDigest = lambdaInvokerWithCronitor(
    Config.SEND_REDACTION_DIGEST_FUNCTION_URL,
    Config.SEND_REDACTION_DIGEST_FUNCTION_NAME,
    Config.SEND_REDACTION_DIGEST_FUNCTION_VERSION,
    Config.CRONITOR_CODE_REDACTION_DIGEST,
  )
  await sendRedactionDigest()
}
