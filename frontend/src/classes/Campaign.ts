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
  hasCredentials: boolean // has valid credentials

  constructor(input: any) {
    this.id = input['id']
    this.name = input['name']
    this.type = input['type']
    this.createdAt = input['createdAt']
    this.sentAt = input['sentAt']
    this.status = input['status']
    this.hasCredentials = input['hasCredentials']
  }
}
