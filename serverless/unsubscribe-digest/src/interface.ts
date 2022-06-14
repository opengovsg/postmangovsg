export interface CampaignUnsubscribeList {
  id: number
  name: string
  unsubscribers: Array<string>
}

export interface UserUnsubscribeDigest {
  email: string
  unsubscribe_list: Array<CampaignUnsubscribeList>
}

export interface Cronitor {
  run: () => Promise<void>
  complete: () => Promise<void>
  fail: (message?: string) => Promise<void>
}
