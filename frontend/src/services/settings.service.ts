import axios from 'axios'
import type { ChannelType } from 'classes'

export interface UserCredential {
  label: string
  type: ChannelType
}

async function getUserSettings(): Promise<{
  hasApiKey: boolean
  creds: UserCredential[]
  demo: {
    numDemosSms: number
    numDemosTelegram: number
    isDisplayed: boolean
  }
  announcementVersion: string
}> {
  try {
    const response = await axios.get('/settings')
    const {
      has_api_key: hasApiKey,
      creds,
      demo,
      announcement_version: announcementVersion,
    } = response.data
    return {
      hasApiKey,
      creds,
      demo: {
        numDemosSms: demo?.num_demos_sms,
        numDemosTelegram: demo?.num_demos_telegram,
        isDisplayed: demo?.is_displayed,
      },
      announcementVersion,
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

async function updateDemoDisplayed(isDisplayed: boolean): Promise<void> {
  try {
    await axios.put('/settings/demo', { is_displayed: isDisplayed })
  } catch (e) {
    errorHandler(e, 'Error updating state of demo displayed')
  }
}

async function updateAnnouncementVersion(
  announcementVersion: string
): Promise<void> {
  try {
    await axios.put('/settings/announcement-version', {
      announcement_version: announcementVersion,
    })
  } catch (e) {
    errorHandler(e, 'Error updating announcement version')
  }
}

function errorHandler(e: unknown, defaultMsg: string): never {
  console.error(e)
  if (
    axios.isAxiosError(e) &&
    e.response &&
    e.response.data &&
    e.response.data.message
  ) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg)
}

export {
  deleteCredential,
  getCustomFromAddresses,
  getUserSettings,
  regenerateApiKey,
  updateAnnouncementVersion,
  updateDemoDisplayed,
}
