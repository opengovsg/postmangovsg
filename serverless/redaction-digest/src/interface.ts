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
