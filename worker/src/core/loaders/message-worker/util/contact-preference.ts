import axios from 'axios'
import { ContactPreference, EmailResultRow } from '../interface'
import config from '@core/config'
import { map } from 'lodash'
import CircuitBreaker from 'opossum'

const options = {
  timeout: 5000, // Trigger failure if phonebook takes longer than 5sec to respond
  errorThresholdPercentage: 20, // When 20% of requests fail, open the circuit
  resetTimeout: 30000, // After 30 seconds, half open the circuit and try again.
}

async function getContactPrefLinks(request: ContactPreference[]) {
  return axios.post(
    config.get('phonebookContactPref.url'),
    JSON.stringify(request),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}

const breaker = new CircuitBreaker(getContactPrefLinks, options)

export const getContactPrefLinksForEmail = async (
  result: EmailResultRow[],
  channel = 'Email'
) => {
  const showMastheadDomain = config.get('showMastheadDomain')
  const request: ContactPreference[] = result.map((row) => {
    return { channel, channelId: row.message.recipient }
  })
  return breaker
    .fire(request)
    .then((resp) => {
      const contactPreferences = resp.data as ContactPreference[]
      return map(result, (row) => {
        const { senderEmail } = row.message
        const showMasthead = senderEmail.endsWith(showMastheadDomain)
        const contactPreference = contactPreferences.find(
          (preference: ContactPreference) =>
            preference.channelId === row.message.recipient
        )
        return {
          ...row.message,
          showMasthead,
          contactPrefLink: contactPreference?.contactPrefLink || '',
        }
      })
    })
    .catch((error) => {
      throw error
    })
}

export const getMessagesWithContactPrefLinks = async (
  result: {
    id: number
    recipient: string
    params: { [key: string]: string }
    body: string
    campaignId: number
  }[],
  channel = 'Sms'
) => {
  const request: ContactPreference[] = result.map((message) => {
    return { channel, channelId: message.recipient }
  })
  return breaker
    .fire(request)
    .then((resp) => {
      const contactPreferences = resp.data as ContactPreference[]
      return map(result, (message) => {
        const contactPreference = contactPreferences.find(
          (preference: ContactPreference) =>
            preference.channelId === message.recipient
        )
        const bodyWithLink = `${message.body}\n Prefer hearing from this agency a different way? Set your preference at: ${contactPreference?.contactPrefLink}`
        return {
          ...message,
          body: bodyWithLink,
        }
      })
    })
    .catch((error) => {
      throw error
    })
}
