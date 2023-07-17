import config from '@core/config'
import PhonebookClient from '@shared/clients/phonebook-client.class'
import {
  GetUniqueLinksRequestDto,
  GetUniqueLinksResponseDto,
  UserChannel,
} from '@shared/clients/phonebook-client.class/interfaces'
import { map } from 'lodash'
import { EmailResultRow, Message } from '@core/loaders/message-worker/interface'
import CircuitBreaker from 'opossum'

const phonebookClient: PhonebookClient = new PhonebookClient(
  config.get('phonebook.endpointUrl'),
  config.get('phonebook.apiKey')
)

const options = {
  timeout: 5000, // Trigger failure if phonebook takes longer than 5sec to respond
  errorThresholdPercentage: 20, // When 20% of requests fail, open the circuit
  resetTimeout: 30000, // After 30 seconds, half open the circuit and try again.
  enabled: true,
}

const getUniqueLinksForUsers = async (body: GetUniqueLinksRequestDto) => {
  const userChannelsRes = await phonebookClient.getUniqueLinksForUsers(body)
  return userChannelsRes.reduce((map, userChannel) => {
    map.set(userChannel.channelId, userChannel)
    return map
  }, new Map<string, GetUniqueLinksResponseDto>())
}

const breaker = new CircuitBreaker(getUniqueLinksForUsers, options)

const appendLinkForEmail = async (
  result: EmailResultRow[],
  managedListId?: number,
  channel = 'Email'
): Promise<Message[]> => {
  const showMastheadDomain = config.get('showMastheadDomain')
  const enableAutoUnsubscribe = config.get('phonebook.enableAutoUnsubscribe')

  const channels: UserChannel[] = result.map((row) => {
    return {
      channel,
      channelId: row.message.recipient,
    }
  })
  const payload: GetUniqueLinksRequestDto = {
    userChannels: channels,
    includeUnsubscribeLink:
      enableAutoUnsubscribe && managedListId
        ? {
            managedListId,
          }
        : undefined,
  }

  return breaker
    .fire(payload)
    .then((res) => {
      const userChannelMap = res
      return map(result, (row) => {
        const { senderEmail } = row.message
        const showMasthead = senderEmail.endsWith(showMastheadDomain)
        const userChannel = userChannelMap.get(row.message.recipient)
        return {
          ...row.message,
          showMasthead,
          userUniqueLink: userChannel?.userUniqueLink || '',
          unsubLink: userChannel?.userUnsubscribeLink,
        }
      })
    })
    .catch((err) => {
      throw err
    })
}

const appendLinkForSms = async (
  result: {
    id: number
    recipient: string
    params: { [key: string]: string }
    body: string
    campaignId: number
  }[],
  channel = 'SMS'
): Promise<
  {
    id: number
    recipient: string
    params: { [key: string]: string }
    body: string
    campaignId: number
  }[]
> => {
  const channels: UserChannel[] = result.map((message) => {
    return {
      channel,
      channelId: message.recipient,
    }
  })
  const payload: GetUniqueLinksRequestDto = {
    userChannels: channels,
  }

  return breaker
    .fire(payload)
    .then((res) => {
      const userChannelMap = res
      return map(result, (message) => {
        const userChannel = userChannelMap.get(message.recipient)
        let body: string
        if (userChannel?.userUniqueLink) {
          body = `${message.body}\n\nKeep your contact details up to date at: ${userChannel?.userUniqueLink}`
        } else {
          body = message.body
        }
        return {
          ...message,
          body,
        }
      })
    })
    .catch((err) => {
      throw err
    })
}

export const PhonebookService = {
  appendLinkForEmail,
  appendLinkForSms,
}
