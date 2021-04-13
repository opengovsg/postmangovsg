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
}

export interface Template {
  body: string
  subject?: string
  from?: string
  params: string
  reply_to?: string
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

  csv_filename: string | null
  is_csv_processing: boolean
  job_queue: any[]
  num_recipients: number | null
  template?: Template
}

interface ProtectedMessage {
  id: string
  payload: string
  passwordHash: string
}
