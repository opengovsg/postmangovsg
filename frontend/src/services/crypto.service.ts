export async function fetchMessage(id: string) {
  try {
    const encryptedData = await fetchEncryptedData(id)
    const decryptedData = await decryptData(encryptedData)
    return decryptedData
  } catch (err) {
    throw new Error(err)
  }
}

export async function fetchEncryptedData(id: string): Promise<string> {
  return Promise.resolve(`encrypted data for ${id}`)
}

export async function decryptData(encryptedData: string): Promise<string> {
  return Promise.resolve(`decrypted data for ${encryptedData}`)
}
