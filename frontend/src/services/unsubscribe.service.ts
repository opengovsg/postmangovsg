import axios, { AxiosError } from 'axios'
export async function unsubscribeRequest({
  campaignId,
  recipient,
  hash,
  version,
}: {
  campaignId: number
  recipient: string
  hash: string
  version: string
}): Promise<void> {
  try {
    await axios.post(`/unsubscribe`, {
      c: campaignId,
      r: recipient,
      h: hash,
      v: version,
    })
    return
  } catch (e) {
    errorHandler(e, 'Error unsubscribing')
  }
}

function errorHandler(e: AxiosError, defaultMsg?: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg || e.response?.statusText)
}
