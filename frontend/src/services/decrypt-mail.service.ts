import axios from 'axios'

import { decryptData, hashPassword } from './crypto.service'
import { hydrateTemplate } from './validate-csv.service'

/**
 * This function should hash the password with salt in url
 * Use messageId and hashpassword to fetch encrypted message
 * Then decrypt with password
 * Decrypted html is sanitized again in case it was bypassed during encryption
 * @param id
 * @param password
 * @param salt
 */
export async function fetchMessage(
  id: string,
  password: string,
  salt = id
): Promise<string> {
  const passwordHash = await hashPassword(password, salt)
  const { payload } = await getEncryptedPayload(id, passwordHash)
  const decryptedData = await decryptData(payload, password, salt)
  const santizedHtml = hydrateTemplate(decryptedData, {})
  return santizedHtml
}

/**
 * Fetches encrypted payload from server
 * @param id
 * @param passwordHash
 */
async function getEncryptedPayload(
  id: string,
  passwordHash: string
): Promise<{ payload: string }> {
  try {
    const response = await axios.post(`/protect/${id}`, {
      password_hash: passwordHash,
    })
    return response.data
  } catch (e) {
    errorHandler(e, 'Please try again later.')
  }
}

function errorHandler(e: unknown, defaultMsg: string): never {
  console.error(e)
  if (
    axios.isAxiosError(e) &&
    e.response &&
    e.response.data &&
    e.response.data.message
  ) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg)
}
