export interface Message {
  id: number
  recipient: string
  params: { [key: string]: string }
  body: string
  subject?: string
  replyTo?: string | null
  campaignId?: number
  from?: string
  agencyName?: string
  agencyLogoURI?: string
  showMasthead?: boolean
  contactPrefLink?: string
}

export interface ContactChannel {
  channel: string
  channelId: string
  contactPrefLink?: string
}

export interface EmailResultRow {
  message: Message & { senderEmail: string }
}
