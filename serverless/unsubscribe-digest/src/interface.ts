export interface MailToSend {
  recipients: Array<string>
  subject: string
  body: string
  replyTo?: string
  referenceId?: string
}

export interface MailCredentials {
  host: string
  port: number
  auth: {
    user: string
    pass: string
  }
}

export interface CampaignUnsubscribeList {
  id: number
  name: string
  unsubscribers: Array<string>
}

export interface UserUnsubscribeDigest {
  email: string
  unsubscribe_list: Array<CampaignUnsubscribeList>
}
