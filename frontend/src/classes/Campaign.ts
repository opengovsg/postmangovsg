export enum ChannelType {
  SMS = 'SMS',
  Email = 'EMAIL',
}

export enum Status {
  Draft = 'draft',
  Sending = 'sending',
  Sent = 'sent',
  Halted = 'halted',
}

export const channelIcons = {
  [ChannelType.SMS]: 'bx-message-detail',
  [ChannelType.Email]: 'bx-envelope',
}

export class Campaign {
  id: number
  name: string
  type: ChannelType
  createdAt: Date
  sentAt: Date
  status: Status
  isCsvProcessing: boolean
  statusUpdatedAt: Date
  protect: boolean

  constructor(input: any) {
    this.id = input['id']
    this.name = input['name']
    this.type = input['type']
    this.createdAt = input['created_at']
    this.status = input['halted']
      ? Status.Halted
      : this.getStatus(input['job_queue'])
    this.isCsvProcessing = input['is_csv_processing']
    this.sentAt = input['sentAt']
    this.statusUpdatedAt = input['statusUpdatedAt']
    this.protect = input['protect']
  }

  getStatus(jobs: Array<{ status: string }>): Status {
    if (jobs) {
      const jobSet = new Set(jobs.map((x) => x.status))
      if (
        ['READY', 'ENQUEUED', 'SENDING', 'SENT', 'STOPPED'].some((s) =>
          jobSet.has(s)
        )
      ) {
        return Status.Sending
      } else if (jobSet.has('LOGGED')) {
        return Status.Sent
      }
    }
    return Status.Draft
  }
}

export class CampaignStats {
  error: number
  unsent: number
  sent: number
  invalid: number
  status: Status
  updatedAt: Date
  halted?: boolean

  constructor(input: any) {
    this.error = +input['error']
    this.unsent = +input['unsent']
    this.sent = +input['sent']
    this.invalid = input['invalid']
    this.status = input['status']
    this.updatedAt = input['updated_at']
    this.halted = input['halted']
  }
}

export class CampaignInvalidRecipient {
  recipient: string
  status: string
  errorCode: string
  updatedAt: string

  constructor(input: any) {
    this.recipient = input['recipient']
    this.status = input['status']
    this.errorCode = input['error_code']
    this.updatedAt = input['updated_at']
  }
}
