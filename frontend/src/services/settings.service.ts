import axios, { AxiosError } from 'axios'
import { ChannelType } from 'classes'

export interface UserCredential {
  label: string
  type: ChannelType
}

async function getUserSettings(): Promise<{
  hasApiKey: boolean
  creds: UserCredential[]
}> {
  try {
    const response = await axios.get('/settings')
    const { has_api_key: hasApiKey, creds } = response.data
    return { hasApiKey, creds }
  } catch (e) {
    errorHandler(e, 'Error fetching credentials')
  }
}

async function regenerateApiKey(): Promise<string> {
  try {
    const response = await axios.post('/settings/regen')
    const { api_key: apiKey } = response.data
    return apiKey
  } catch (e) {
    errorHandler(e, 'Error regenerating api key')
  }
}

async function deleteCredential(label: string): Promise<void> {
  try {
    await axios.delete('/settings/credentials', {
      data: {
        label,
      },
    })
    return
  } catch (e) {
    errorHandler(e, 'Error regenerating api key')
  }
}

function errorHandler(e: AxiosError, defaultMsg: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg)
}

export { regenerateApiKey, getUserSettings, deleteCredential }
