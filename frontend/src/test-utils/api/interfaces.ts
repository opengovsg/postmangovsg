export interface State {
  // Stats
  totalMessagesSent: number

  // Auth
  users: User[]
  curUserId: number

  // Campaigns
  campaigns: Campaign[]

  // Protected messages
  protectedMessages: ProtectedMessage[]

  // Custom from addresses
  customFroms?: string[]
}

interface User {
  api_key: string
  creds: Credential[]
  demo: {
    num_demo_sms: number
    num_demo_telegram: number
    is_displayed: boolean
  }
  email: string
  id: number
}

interface Credential {
  label: string
  type: string
  valid: boolean
}

export interface EmailTemplate {
  body: string
  subject: string
  from: string
  params: string[]
  reply_to: string
}

export interface TelegramTemplate {
  body: string
  params: string[]
}

export interface SMSTemplate {
  body: string
  params: string[]
}

export interface Campaign {
  created_at: Date
  demo_message_limit: number | null
  halted: boolean
  id: number
  name: string
  protect: boolean
  type: string
  valid: boolean
  has_credential: boolean
  cost_per_message?: number

  // Templates
  sms_templates?: SMSTemplate
  email_templates?: EmailTemplate
  telegram_templates?: TelegramTemplate

  // Recipients
  temp_csv_filename?: string
  csv_error?: string
  csv_filename: string | null
  is_csv_processing: boolean
  num_recipients: number | null

  job_queue: any[]
}

interface ProtectedMessage {
  id: string
  payload: string
  passwordHash: string
}
