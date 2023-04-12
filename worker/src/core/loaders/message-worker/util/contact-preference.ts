import axios from 'axios'
import { ContactChannel, EmailResultRow } from '../interface'
import config from '@core/config'
import { map } from 'lodash'
import CircuitBreaker from 'opossum'

const options = {
  timeout: 5000, // Trigger failure if phonebook takes longer than 5sec to respond
  errorThresholdPercentage: 20, // When 20% of requests fail, open the circuit
  resetTimeout: 30000, // After 30 seconds, half open the circuit and try again.
}

type ContactPreferenceRequest = {
  userChannels: ContactChannel[]
}

async function getContactPrefLinks(request: ContactPreferenceRequest) {
  const url = `${config.get(
    'phonebookContactPref.url'
  )}/api/v1/generate_pref_links`
  return axios
    .post(url, JSON.stringify(request), {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.get('phonebookContactPref.apiKey'),
      },
    })
    .then((resp) => resp.data)
    .catch((err) => {
      throw err
    })
}

const breaker = new CircuitBreaker(getContactPrefLinks, options)

export const getContactPrefLinksForEmail = async (
  result: EmailResultRow[],
  campaignId: number,
  campaignOwnerEmail: string,
  channel = 'Email'
) => {
  const showMastheadDomain = config.get('showMastheadDomain')
  const userChannels: ContactChannel[] = result.map((row) => {
    return {
      channel,
      channelId: row.message.recipient,
    }
  })
  const request = {
    userChannels,
    postmanCampaignId: campaignId,
    postmanCampaignOwner: campaignOwnerEmail,
  }
  return breaker
    .fire(request)
    .then((resp) => {
      const userChannels = resp as ContactChannel[]
      return map(result, (row) => {
        const { senderEmail } = row.message
        const showMasthead = senderEmail.endsWith(showMastheadDomain)
        const contactPreference = userChannels.find(
          (preference: ContactChannel) =>
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
  campaignId: number,
  campaignOwnerEmail: string,
  channel = 'Sms'
) => {
  const userChannels: ContactChannel[] = result.map((message) => {
    return {
      channel,
      channelId: message.recipient,
    }
  })
  const request = {
    userChannels,
    postmanCampaignId: campaignId,
    postmanCampaignOwner: campaignOwnerEmail,
  }
  return breaker
    .fire(request)
    .then((resp) => {
      const userChannels = resp as ContactChannel[]
      return map(result, (message) => {
        const contactPreference = userChannels.find(
          (preference: ContactChannel) =>
            preference.channelId === message.recipient
        )
        const bodyWithLink = `${message.body}\n\nPrefer hearing from this agency a different way? Set your preference at: ${contactPreference?.contactPrefLink}`
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
