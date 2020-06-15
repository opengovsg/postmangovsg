import axios, { AxiosError } from 'axios'

export async function storeCredentials({
  label,
  telegramBotToken,
}: {
  label: string
  telegramBotToken: string
}): Promise<void> {
  try {
    await axios.post(`/settings/telegram/credentials`, {
      label,
      telegram_bot_token: telegramBotToken,
    })
  } catch (e) {
    errorHandler(e, 'Error saving credentials.')
  }
}

export async function verifyUserCredentials({
  label,
  recipient,
}: {
  label: string
  recipient: string
}): Promise<void> {
  try {
    await axios.post(`/settings/telegram/credentials/verify`, {
      recipient,
      label,
    })
  } catch (e) {
    errorHandler(e, 'Error verifying credentials.')
  }
}

function errorHandler(e: AxiosError, defaultMsg: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg)
}
