import {
  WhatsappPhoneNumber,
  WhatsappTemplate,
} from '@shared/clients/whatsapp-client.class/interfaces'
import axios from 'axios'

export async function getStoredCredentials(): Promise<string[]> {
  try {
    const response = await axios.get('/settings/whatsapp/credentials')
    return response.data
  } catch (e) {
    errorHandler(e, 'Error retrieving stored credentials')
  }
}

export async function getStoredTemplates(
  wabaId: string
): Promise<WhatsappTemplate[]> {
  try {
    const response = await axios.post('/settings/whatsapp/templates', {
      label: wabaId,
    })
    return response.data
  } catch (e) {
    errorHandler(e, 'Error retrieving message templates')
  }
}

export async function getPhoneNumbers(
  wabaId: string
): Promise<WhatsappPhoneNumber[]> {
  try {
    const response = await axios.post('/settings/whatsapp/phone-numbers', {
      label: wabaId,
    })
    return response.data
  } catch (e) {
    errorHandler(e, 'Error retrieving phone numbers')
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
