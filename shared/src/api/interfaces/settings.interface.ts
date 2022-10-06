export enum ChannelType {
  SMS = 'SMS',
  Email = 'EMAIL',
  Telegram = 'TELEGRAM',
}

export interface SettingsInterface {
  hasApiKey: boolean
  creds: UserCredential[]
  demo: {
    numDemosSms: number
    numDemosTelegram: number
    isDisplayed: boolean
  }
  announcementVersion: string
}

export interface UserCredential {
  label: string
  type: ChannelType
}
