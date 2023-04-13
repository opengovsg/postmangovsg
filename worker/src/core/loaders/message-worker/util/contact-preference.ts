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
  const response = await axios.post(url, JSON.stringify(request), {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.get('phonebookContactPref.apiKey'),
    },
  })
  return response?.data
}

const breaker = new CircuitBreaker(getContactPrefLinks, options)

export const getContactPrefLinksForEmail = async (
  result: EmailResultRow[],
  campaignId: number,
  campaignOwnerEmail: string,
  channel = 'Email'
) => {
  const showMastheadDomain = config.get('showMastheadDomain')
  const userChannelsRequest: ContactChannel[] = result.map((row) => {
    return {
      channel,
      channelId: row.message.recipient,
    }
  })
  const request = {
    userChannels: userChannelsRequest,
    postmanCampaignId: campaignId,
    postmanCampaignOwner: campaignOwnerEmail,
  }
  const response = await breaker.fire(request)
  const userChannelsResp = response as ContactChannel[]
  const userChannelMap = userChannelsResp.reduce(
    (map: Map<string, ContactChannel>, contactChannel: ContactChannel) => {
      map.set(contactChannel.channelId, contactChannel)
      return map
    },
    new Map<string, ContactChannel>()
  )

  return map(result, (row) => {
    const { senderEmail } = row.message
    const showMasthead = senderEmail.endsWith(showMastheadDomain)
    const contactPreference = userChannelMap.get(row.message.recipient)
    return {
      ...row.message,
      showMasthead,
      contactPrefLink: contactPreference?.contactPrefLink || '',
    }
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
  const userChannelsRequest: ContactChannel[] = result.map((message) => {
    return {
      channel,
      channelId: message.recipient,
    }
  })
  const request = {
    userChannels: userChannelsRequest,
    postmanCampaignId: campaignId,
    postmanCampaignOwner: campaignOwnerEmail,
  }
  const response = await breaker.fire(request)
  const userChannelsResp = response as ContactChannel[]
  const userChannelMap = userChannelsResp.reduce(
    (map: Map<string, ContactChannel>, contactChannel: ContactChannel) => {
      map.set(contactChannel.channelId, contactChannel)
      return map
    },
    new Map<string, ContactChannel>()
  )

  return map(result, (message) => {
    const contactPreference = userChannelMap.get(message.recipient)
    const bodyWithLink = `${message.body}\n\nPrefer hearing from this agency a different way? Set your preference at: ${contactPreference?.contactPrefLink}`
    return {
      ...message,
      body: bodyWithLink,
    }
  })
}
