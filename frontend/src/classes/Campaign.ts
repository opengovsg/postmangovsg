export enum ChannelType {
  SMS = 'SMS',
  Email = 'EMAIL',
}

export enum Status {
  Draft = 'draft',
  Sending = 'sending',
  Sent = 'sent',
}

export const channelIcons = {
  [ChannelType.SMS]: 'bx-message-detail',
  [ChannelType.Email]: 'bx-envelope-open',
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

  constructor(input: any) {
    this.id = input['id']
    this.name = input['name']
    this.type = input['type']
    this.createdAt = input['created_at']
    this.sentAt = input['sent_at']
    this.status = this.getStatus(input['job_queue'])
    this.isCsvProcessing = input['is_csv_processing']
    this.statusUpdatedAt = input['statusUpdatedAt']
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

  constructor(input: any) {
    this.error = +input['error']
    this.unsent = +input['unsent']
    this.sent = +input['sent']
    this.invalid = input['invalid']
    this.status = input['status']
    this.updatedAt = input['updatedAt']
  }
}

export class CampaignInvalidRecipients {
  recipient: string
  messageId: string
  errorCode: string
  sentAt: Date
  updatedAt: Date

  constructor(input: any) {
    this.recipient = input['recipient']
    this.messageId = input['message_id']
    this.errorCode = input['error_code']
    this.sentAt = input['sentAt']
    this.updatedAt = input['updatedAt']
  }
}
