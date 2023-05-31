import config from '@core/config'
import PhonebookClient from '@shared/clients/phonebook-client.class'
import {
  PhonebookChannelDto,
  UserChannel,
} from '@shared/clients/phonebook-client.class/interfaces'
import { map } from 'lodash'
import { EmailResultRow, Message } from '@core/loaders/message-worker/interface'

const phonebookClient: PhonebookClient = new PhonebookClient(
  config.get('phonebook.endpointUrl'),
  config.get('phonebook.apiKey'),
  config.get('phonebook.version')
)

const appendLinkForEmail = async (
  result: EmailResultRow[],
  campaignOwnerEmail: string,
  channel = 'Email'
) => {
  const showMastheadDomain = config.get('showMastheadDomain')

  const channels: UserChannel[] = result.map((row) => {
    return {
      channel,
      channelId: row.message.recipient,
    }
  })
  const payload: PhonebookChannelDto = {
    userChannels: channels,
    postmanCampaignOwner: campaignOwnerEmail,
  }

  const userChannelMap = await getUniqueLinksForUsers(payload)

  return map(result, (row) => {
    const { senderEmail } = row.message
    const showMasthead = senderEmail.endsWith(showMastheadDomain)
    const userChannel = userChannelMap.get(row.message.recipient)
    return {
      ...row.message,
      showMasthead,
      userUniqueLink: userChannel?.userUniqueLink || '',
    }
  })
}

const appendLinkForSms = async (
  result: Message[],
  campaignOwnerEmail: string,
  channel = 'Sms'
) => {
  const channels: UserChannel[] = result.map((message) => {
    return {
      channel,
      channelId: message.recipient,
    }
  })
  const payload: PhonebookChannelDto = {
    userChannels: channels,
    postmanCampaignOwner: campaignOwnerEmail,
  }

  const userChannelMap = await getUniqueLinksForUsers(payload)

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
}

const getUniqueLinksForUsers = async (
  body: PhonebookChannelDto
): Promise<Map<string, UserChannel>> => {
  const userChannelsRes = await phonebookClient.getUniqueLinksForUsers(body)
  return userChannelsRes.reduce(
    (map: Map<string, UserChannel>, userChannel: UserChannel) => {
      map.set(userChannel.channelId, userChannel)
      return map
    },
    new Map<string, UserChannel>()
  )
}
export const PhonebookService = {
  appendLinkForEmail,
  appendLinkForSms,
}
