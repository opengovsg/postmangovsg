import axios, { AxiosError } from 'axios'
import { ChannelType } from 'classes'

export interface UserCredential {
  label: string
  type: ChannelType
}

async function getUserSettings(): Promise<{
  hasApiKey: boolean
  creds: UserCredential[]
  trial: {
    numTrialsSms: number
    numTrialsTelegram: number
    isDisplayed: boolean
  }
}> {
  try {
    const response = await axios.get('/settings')
    const { has_api_key: hasApiKey, creds, trial } = response.data
    return {
      hasApiKey,
      creds,
      trial: {
        numTrialsSms: trial?.num_trials_sms,
        numTrialsTelegram: trial?.num_trials_telegram,
        isDisplayed: trial?.is_displayed,
      },
    }
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

async function getCustomFromAddresses(): Promise<string[]> {
  try {
    const response = await axios.get('/settings/email/from')
    const { from } = response.data
    return from
  } catch (e) {
    errorHandler(e, 'Error getting from addresses')
  }
}

async function updateTrialDisplayed(isDisplayed: boolean): Promise<void> {
  try {
    await axios.put('/settings/trial', { is_displayed: isDisplayed })
  } catch (e) {
    errorHandler(e, 'Error updating state of trial displayed')
  }
}

function errorHandler(e: AxiosError, defaultMsg: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg)
}

export {
  regenerateApiKey,
  getUserSettings,
  deleteCredential,
  getCustomFromAddresses,
  updateTrialDisplayed,
}
