import { decryptData } from './crypto.service'

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
    const encryptedData = await Promise.resolve('Stubbed message')
    const decryptedData = await decryptData(encryptedData, password, salt)
    return decryptedData
  } catch (err) {
    /**
     * Handle and obfuscate error
     */
    throw new Error(err)
  }
}
