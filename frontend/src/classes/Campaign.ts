import moment from 'moment'

export enum ChannelType {
  SMS = 'SMS',
  Email = 'EMAIL',
  Telegram = 'TELEGRAM',
  Govsg = 'GOVSG',
}

export enum Status {
  Draft = 'Draft',
  Scheduled = 'Scheduled',
  Sending = 'Sending',
  Sent = 'Sent',
  Halted = 'Halted',
}

export enum StatusFilter {
  Draft = 'Draft',
  Sent = 'Sent',
  Scheduled = 'Scheduled',
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
  [ChannelType.Govsg]: 'bx-govsg',
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
  scheduledAt?: Date
  visibleAt?: string

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
    this.visibleAt = input['visibleAt']
    // override sentAt if it's a scheduled campaign
    if (this.visibleAt) {
      if (new Date(this.visibleAt) > new Date()) {
        // don't show sent at if it's scheduled but not sent out yet
        this.sentAt = undefined
      } else {
        this.sentAt = this.visibleAt
      }
    }
    if (this.status === Status.Scheduled) {
      const jobs = input['job_queue'] as Array<{ visible_at: string }>
      const jobsVisibleTime = jobs
        .map(({ visible_at: visibleAt }) => new Date(visibleAt))
        .sort()
      this.scheduledAt = jobsVisibleTime[0]
    }
  }

  getStatus(jobs: Array<{ status: string; visible_at?: string }>): Status {
    if (jobs) {
      const jobSet = new Set(jobs.map((x) => x.status))
      // TODO: frontend and backend are misaligned in how they determine if a campaign has been sent (part 2/2)
      if (
        ['READY', 'ENQUEUED', 'SENDING', 'SENT', 'STOPPED'].some((s) =>
          jobSet.has(s)
        )
      ) {
        if (
          jobs.every(({ visible_at }) => {
            return visible_at && new Date(visible_at) >= new Date()
          })
        ) {
          return Status.Scheduled
        }
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
  visibleAt?: string

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
    this.visibleAt = input['visible_at']
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
