export enum ChannelType {
  SMS = 'SMS',
  Email = 'EMAIL',
  Telegram = 'TELEGRAM',
}

export enum Status {
  Draft = 'Draft',
  Sending = 'Sending',
  Sent = 'Sent',
  Halted = 'Halted',
}

export const channelIcons = {
  [ChannelType.SMS]: 'bx-message-detail',
  [ChannelType.Email]: 'bx-envelope',
  [ChannelType.Telegram]: 'bxl-telegram',
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
  statusUpdatedAt: Date // Timestamp when job's status was changed to this status
  updatedAt: Date // Timestamp when statistic was updated
  halted?: boolean
  waitTime?: number

  constructor(input: any) {
    this.error = +input['error']
    this.unsent = +input['unsent']
    this.sent = +input['sent']
    this.invalid = input['invalid']
    this.status = input['status']
    this.statusUpdatedAt = input['status_updated_at']
    this.updatedAt = input['updated_at']
    this.halted = input['halted']
    this.waitTime = input['wait_time']
  }
}

export class CampaignRecipient {
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
