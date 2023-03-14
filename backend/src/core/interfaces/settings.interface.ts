import { ChannelType } from '@core/constants'

export interface CredentialLabel {
  label: string
  type: ChannelType
}
export interface UserSettings {
  creds: Array<CredentialLabel>
  demo: {
    numDemosSms: number
    numDemosTelegram: number
    isDisplayed: boolean
  }
  userFeature: {
    announcementVersion: string | null
  }
}
