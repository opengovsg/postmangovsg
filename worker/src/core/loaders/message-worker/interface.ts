export interface Message {
  id: number
  recipient: string
  params: { [key: string]: string }
  body: string
  subject?: string
  replyTo?: string | null
  campaignId?: number
  from?: string
  showMasthead?: boolean
}
