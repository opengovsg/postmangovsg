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
    recipient = window.encodeURIComponent(recipient)
    await axios.put(`/unsubscribe/${campaignId}/${recipient}`, {
      h: hash,
      v: version,
    })
    return
  } catch (e) {
    errorHandler(e, 'Error unsubscribing')
  }
}

function errorHandler(e: unknown, defaultMsg?: string): never {
  console.error(e)
  if (
    axios.isAxiosError(e) &&
    e.response &&
    e.response.data &&
    e.response.data.message
  ) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg || (e as AxiosError).response?.statusText)
}
