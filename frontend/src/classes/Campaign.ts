export enum ChannelType {
  SMS = 'sms',
  Email = 'email',
}

export enum Status {
  Draft = 'draft',
  Sending = 'sending',
  Sent = 'sent',
}

export class Campaign {
  id: number
  name: string
  type: ChannelType
  createdAt: Date
  sentAt: Date
  status: Status

  constructor(input: any) {
    this.id = input['id']
    this.name = input['name']
    this.type = input['type']
    this.createdAt = input['createdAt']
    this.sentAt = input['sentAt']
    this.status = input['status']
  }
}

export class CampaignStats {
  error: number
  invalid: number
  unsent: number
  sent: number
  status: Status

  constructor(input: any) {
    this.error = input['error']
    this.invalid = input['invalid']
    this.unsent = input['unsent']
    this.sent = input['sent']
    this.status = input['status']
  }
}
