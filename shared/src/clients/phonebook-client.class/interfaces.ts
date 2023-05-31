export type PhonebookChannelDto = {
  userChannels: UserChannel[]
  postmanCampaignOwner: string
}

export type UserChannel = {
  channel: string
  channelId: string
}
