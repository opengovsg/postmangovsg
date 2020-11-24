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

export interface RedactedCampaign {
  id: number
  name: string
  expiry_date: Date
}

export interface UserRedactedCampaigns {
  email: string
  campaigns: Array<RedactedCampaign>
}

export interface Cronitor {
  run: () => Promise<void>
  complete: () => Promise<void>
  fail: (message?: string) => Promise<void>
}
