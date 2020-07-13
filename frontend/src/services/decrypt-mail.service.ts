import axios from 'axios'
import { decryptData, deriveHashedPassword } from './crypto.service'

async function getEncryptedPayload(
  id: string,
  hashedPassword: string
): Promise<string> {
  return axios.post(`/protect/${id}`, { hashedPassword }).then((response) => {
    return response.data?.encryptedPayload
  })
}

/**
 * This function should hash the password with salt in url
 * Use messageId and hashpassword to fetch encrypted message
 * Then decrypt with password
 * @param id
 * @param password
 * @param salt
 */
export async function fetchMessage(id: string, password: string, salt = id) {
  try {
    const hashedPassword = await deriveHashedPassword(password, salt)
    const encryptedData = await getEncryptedPayload(id, hashedPassword)
    const decryptedData = await decryptData(encryptedData, password, salt)
    return decryptedData
  } catch (err) {
    /**
     * Handle and obfuscate error
     */
    throw new Error(err)
  }
}
