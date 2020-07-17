import axios, { AxiosError } from 'axios'
import { decryptData, hashPassword } from './crypto.service'

/**
 * This function should hash the password with salt in url
 * Use messageId and hashpassword to fetch encrypted message
 * Then decrypt with password
 * @param id
 * @param password
 * @param salt
 */
export async function fetchMessage(id: string, password: string, salt = id) {
  const passwordHash = await hashPassword(password, salt)
  const encryptedData = await getEncryptedPayload(id, passwordHash)
  const decryptedData = await decryptData(encryptedData, password, salt)
  return decryptedData
}

/**
 * Fetches encrypted payload from server
 * @param id
 * @param passwordHash
 */
async function getEncryptedPayload(
  id: string,
  passwordHash: string
): Promise<string> {
  try {
    const response = await axios.post(`/protect/${id}`, {
      password_hash: passwordHash,
    })
    return response.data.payload
  } catch (e) {
    errorHandler(e, 'Please try again later.')
  }
}

function errorHandler(e: AxiosError, defaultMsg: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg || e.response?.statusText)
}
