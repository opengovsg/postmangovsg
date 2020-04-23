export enum ChannelType {
  SMS = 'SMS',
  Email = 'EMAIL',
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
    this.createdAt = input['created_at']
    this.sentAt = input['sent_at']
    this.status = this.getStatus(input['job_queue'])
  }

  getStatus(jobs: Array<{ status: string }>): Status {
    if (jobs) {
      const jobSet = new Set(jobs.map((x => x.status)))
      if (jobSet.has('READY') || jobSet.has('ENQUEUED') || jobSet.has('SENDING')) {
        return Status.Sending
      }
      else if (jobSet.has('SENT') || jobSet.has('LOGGED')) {
        return Status.Sent
      }
    }
    return Status.Draft
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
