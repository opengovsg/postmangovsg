import { Config } from 'sst/node/config'

import { lambdaInvokerWithCronitor } from '../lambda-invoker'

export async function handler() {
  const sendApiKeyExpiryEmail = lambdaInvokerWithCronitor(
    Config.SEND_API_KEY_EXPIRY_EMAIL_FUNCTION_URL,
    Config.SEND_API_KEY_EXPIRY_EMAIL_FUNCTION_NAME,
    Config.SEND_API_KEY_EXPIRY_EMAIL_FUNCTION_VERSION,
    Config.CRONITOR_CODE_API_KEY_EXPIRY,
  )
  await sendApiKeyExpiryEmail()
}
