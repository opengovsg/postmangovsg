import moment from 'moment'

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

export enum StatusFilter {
  Draft = 'Draft',
  Sent = 'Sent',
}

export enum SortField {
  Created = 'created_at',
  Sent = 'sent_at',
}

export enum Ordering {
  ASC = 'ASC',
  DESC = 'DESC',
}

export const channelIcons = {
  [ChannelType.SMS]: 'bx-message-detail',
  [ChannelType.Email]: 'bx-envelope-open',
  [ChannelType.Telegram]: 'bx-paper-plane',
}

export class Campaign {
  id: number
  name: string
  type: ChannelType
  createdAt: string
  sentAt?: string
  status: Status
  isCsvProcessing: boolean
  statusUpdatedAt?: string
  protect: boolean
  redacted: boolean
  demoMessageLimit: number | null
  costPerMessage?: number
  shouldSaveList: boolean

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
    this.redacted = input['redacted']
    this.demoMessageLimit = input['demo_message_limit']
    this.costPerMessage = input['cost_per_message']
    this.shouldSaveList = input['should_save_list']
  }

  getStatus(jobs: Array<{ status: string }>): Status {
    if (jobs) {
      const jobSet = new Set(jobs.map((x) => x.status))
      // TODO: frontend and backend are misaligned in how they determine if a campaign has been sent (part 2/2)
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
  statusUpdatedAt: string // Timestamp when job's status was changed to this status
  updatedAt: string // Timestamp when statistic was updated
  halted?: boolean
  waitTime?: number
  redacted?: boolean
  unsubscribed?: number

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
    this.unsubscribed = input['unsubscribed']
  }
}

export abstract class CampaignRecipient {
  recipient: string
  status: string
  errorCode: string
  updatedAt: string

  constructor(input: any) {
    this.recipient = input['recipient']
    this.status = input['status']
    this.errorCode = this.formatErrorCode(input['error_code'])
    this.updatedAt = moment(input['updated_at']).format('LLL').replace(',', '')
  }

  protected abstract formatErrorCode(errorCode: string): string
}
