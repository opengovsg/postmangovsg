import axios, { AxiosError } from 'axios'
import { EmailPreview } from 'classes'

export async function saveTemplate(
  campaignId: number,
  subject: string,
  body: string,
  replyTo: string | null
): Promise<{
  numRecipients: number
  updatedTemplate?: {
    body: string
    subject: string
    reply_to: string | null
    params: Array<string>
  }
}> {
  try {
    const response = await axios.put(`/campaign/${campaignId}/email/template`, {
      body,
      subject,
      // Replace unwanted values (undefined and empty string) with null. Cases where this happens:
      // 1. User saves the template with no replyTo email - undefined
      // 2. User deletes the replyTo email after previously setting it - empty string
      reply_to: replyTo || null,
    })
    const {
      num_recipients: numRecipients,
      template: updatedTemplate,
    } = response.data
    return { numRecipients, updatedTemplate }
  } catch (e) {
    errorHandler(e, 'Error saving template')
  }
}

export async function sendPreviewMessage({
  campaignId,
  recipient,
}: {
  campaignId: number
  recipient: string
}): Promise<void> {
  try {
    await axios.post(`/campaign/${campaignId}/email/credentials`, {
      recipient,
    })
  } catch (e) {
    errorHandler(e, 'Send preview message failed')
  }
}

export async function getPreviewMessage(
  campaignId: number
): Promise<EmailPreview> {
  try {
    const response = await axios.get(`/campaign/${campaignId}/email/preview`)
    const { body, subject, reply_to: replyTo } = response.data?.preview
    return { body, subject, replyTo }
  } catch (e) {
    errorHandler(e, 'Unable to get preview message')
  }
}

function errorHandler(e: AxiosError, defaultMsg: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg || e.response?.statusText)
}
