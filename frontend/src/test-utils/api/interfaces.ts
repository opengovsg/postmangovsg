export interface State {
  // Stats
  totalMessagesSent: number

  // Auth
  users: User[]
  curUserId: number
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
