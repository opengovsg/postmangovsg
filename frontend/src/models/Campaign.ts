export enum ChannelType {
  SMS = 'SMS',
  EMAIL = 'EMAIL'
}

export abstract class Campaign {
  name!: string
  type!: ChannelType
  credName?: string
  s3Object?: object
  valid!: boolean
  timeSent?: string
  msgsSent?: number
  status!: string
}