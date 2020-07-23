import axios, { AxiosError } from 'axios'
export async function unsubscribeRecipient({
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

export async function isUserUnsubscribed({
  campaignId,
  recipient,
  hash,
  version,
}: {
  campaignId: number
  recipient: string
  hash: string
  version: string
}): Promise<boolean> {
  try {
    const response = await axios.get('/unsubscribe', {
      params: {
        c: campaignId,
        r: recipient,
        h: hash,
        v: version,
      },
    })
    const { unsubscribed } = response.data

    return unsubscribed
  } catch (e) {
    errorHandler(e, 'Error checking if user is unsubscribed')
  }
}

function errorHandler(e: AxiosError, defaultMsg?: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg || e.response?.statusText)
}
