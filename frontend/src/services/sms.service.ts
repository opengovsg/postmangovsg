import axios, { AxiosError } from 'axios'
import { SMSPreview } from 'classes'

// Twilio states that total character limit for sms is 1600 characters
// this defines a threshold at which we warn the users on their template length
const SMS_WARN_EXCEED_CHARACTER_THRESHOLD = 1000

export function exceedsCharacterThreshold(body: string): boolean {
  return body.length > SMS_WARN_EXCEED_CHARACTER_THRESHOLD
}

export async function saveTemplate(
  campaignId: number,
  body: string
): Promise<{
  numRecipients: number
  updatedTemplate?: { body: string; params: Array<string> }
}> {
  try {
    const response = await axios.put(`/campaign/${campaignId}/sms/template`, {
      body,
    })
    const {
      num_recipients: numRecipients,
      template: updatedTemplate,
    } = response.data
    return { numRecipients, updatedTemplate }
  } catch (e) {
    errorHandler(e, 'Error saving template.')
  }
}

export async function validateNewCredentials({
  campaignId,
  accountSid,
  apiKey,
  apiSecret,
  messagingServiceSid,
  recipient,
  label,
}: {
  campaignId: number
  recipient: string
  accountSid: string
  apiKey: string
  apiSecret: string
  messagingServiceSid: string
  label?: string
}): Promise<void> {
  try {
    await axios.post(`/campaign/${campaignId}/sms/new-credentials/v2`, {
      recipient,
      label,
      twilio_account_sid: accountSid,
      twilio_api_key: apiKey,
      twilio_api_secret: apiSecret,
      twilio_messaging_service_sid: messagingServiceSid,
    })
  } catch (e) {
    errorHandler(e, 'Error validating credentials.')
  }
}

export async function validateStoredCredentials({
  campaignId,
  recipient,
  label,
}: {
  campaignId: number
  recipient: string
  label: string
}): Promise<void> {
  try {
    await axios.post(`/campaign/${campaignId}/sms/credentials`, {
      recipient,
      label,
    })
  } catch (e) {
    errorHandler(e, 'Error validating credentials.')
  }
}

export async function verifyUserCredentials({
  recipient,
  label,
}: {
  label: string
  recipient: string
}): Promise<void> {
  try {
    await axios.post(`/settings/sms/credentials/verify`, {
      recipient,
      label,
    })
  } catch (e) {
    errorHandler(e, 'Error verifying credentials.')
  }
}

export async function storeCredentials({
  label,
  accountSid,
  apiKey,
  apiSecret,
  messagingServiceSid,
  recipient,
}: {
  label: string
  accountSid: string
  apiKey: string
  apiSecret: string
  messagingServiceSid: string
  recipient: string
}): Promise<void> {
  try {
    await axios.post('/settings/sms/credentials', {
      label,
      twilio_account_sid: accountSid,
      twilio_api_key: apiKey,
      twilio_api_secret: apiSecret,
      twilio_messaging_service_sid: messagingServiceSid,
      recipient,
    })
  } catch (e) {
    errorHandler(e, 'Error saving credentials.')
  }
}

export async function getStoredCredentials(): Promise<string[]> {
  try {
    const response = await axios.get('/settings/sms/credentials')
    return response.data
  } catch (e) {
    errorHandler(e, 'Error retrieving stored credentials')
  }
}

export async function getPreviewMessage(
  campaignId: number
): Promise<SMSPreview> {
  try {
    const response = await axios.get(`/campaign/${campaignId}/sms/preview`)
    return response.data?.preview
  } catch (e) {
    errorHandler(e, 'Unable to get preview message')
  }
}

function errorHandler(e: AxiosError, defaultMsg: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg)
}
