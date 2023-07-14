export type PhonebookChannelDto = {
  userChannels: UserChannel[]
}

export type UserChannel = {
  channel: string
  channelId: string
  userUniqueLink?: string
}
