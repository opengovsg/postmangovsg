import { WhatsAppMessageStatus } from '@shared/clients/whatsapp-client.class/types'

export enum ChannelType {
  SMS = 'SMS',
  Email = 'EMAIL',
  Telegram = 'TELEGRAM',
  Govsg = 'GOVSG',
}

export enum CampaignStatus {
  Draft = 'Draft',
  Sending = 'Sending',
  Sent = 'Sent',
  Scheduled = 'Scheduled',
}

export enum JobStatus {
  Ready = 'READY',
  Enqueued = 'ENQUEUED',
  Sending = 'SENDING',
  Sent = 'SENT',
  Stopped = 'STOPPED',
  Logged = 'LOGGED',
}

export enum MessageStatus {
  Sending = 'SENDING',
  Error = 'ERROR',
  Success = 'SUCCESS',
  Read = 'READ',
  InvalidRecipient = 'INVALID_RECIPIENT',
}

export enum GovsgMessageStatus {
  Unsent = 'UNSENT',
  Accepted = 'ACCEPTED',
  Sent = 'SENT',
  Delivered = 'DELIVERED',
  Read = 'READ',
  Error = 'ERROR',
  InvalidRecipient = 'INVALID_RECIPIENT',
  Deleted = 'DELETED',
}

export const govsgMessageStatusMapper = (
  whatsappStatus: Exclude<WhatsAppMessageStatus, WhatsAppMessageStatus.warning>
) => {
  switch (whatsappStatus) {
    case WhatsAppMessageStatus.sent:
      return GovsgMessageStatus.Sent
    case WhatsAppMessageStatus.delivered:
      return GovsgMessageStatus.Delivered
    case WhatsAppMessageStatus.read:
      return GovsgMessageStatus.Read
    case WhatsAppMessageStatus.failed:
      return GovsgMessageStatus.Error
    case WhatsAppMessageStatus.deleted:
      return GovsgMessageStatus.Deleted
    default: {
      const exhaustiveCheck: never = whatsappStatus
      throw new Error(`Unhandled status: ${exhaustiveCheck}`)
    }
  }
}

// ensure status updates never overrides a less "updated" status
// there is still a non-zero chance of race condition happening, but ignore for now
export const shouldUpdateStatus = (
  status: GovsgMessageStatus,
  prevStatus: GovsgMessageStatus
): boolean => {
  switch (status) {
    case GovsgMessageStatus.Error:
      return true // always update error status
    case GovsgMessageStatus.InvalidRecipient:
      return true // always update invalid recipient status
    case GovsgMessageStatus.Unsent:
      return false // will never be occur in practice
    case GovsgMessageStatus.Accepted:
      return prevStatus === GovsgMessageStatus.Unsent
    case GovsgMessageStatus.Sent:
      return (
        prevStatus === GovsgMessageStatus.Unsent ||
        prevStatus === GovsgMessageStatus.Accepted
      )
    case GovsgMessageStatus.Delivered:
      return (
        prevStatus === GovsgMessageStatus.Sent ||
        prevStatus === GovsgMessageStatus.Unsent ||
        prevStatus === GovsgMessageStatus.Accepted
      )
    case GovsgMessageStatus.Read:
      return (
        prevStatus === GovsgMessageStatus.Delivered ||
        prevStatus === GovsgMessageStatus.Sent ||
        prevStatus === GovsgMessageStatus.Unsent ||
        prevStatus === GovsgMessageStatus.Accepted
      )
    case GovsgMessageStatus.Deleted:
      return (
        prevStatus === GovsgMessageStatus.Read ||
        prevStatus === GovsgMessageStatus.Delivered ||
        prevStatus === GovsgMessageStatus.Sent ||
        prevStatus === GovsgMessageStatus.Unsent ||
        prevStatus === GovsgMessageStatus.Accepted
      )
    default: {
      const exhaustiveCheck: never = status
      throw new Error(`Unhandled status: ${exhaustiveCheck}`)
    }
  }
}

export enum DefaultCredentialName {
  Email = 'EMAIL_DEFAULT',
  SMS = 'Postman_SMS_Demo',
  Telegram = 'Postman_Telegram_Demo',
  Govsg = 'GOVSG_DEFAULT',
}

export enum CampaignSortField {
  Created = 'created_at',
  Sent = 'sent_at',
}

export enum Ordering {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum TransactionalEmailSortField {
  Created = 'created_at',
  Updated = 'updated_at',
}

export enum TransactionalSmsSortField {
  Created = 'created_at',
  Updated = 'updated_at',
}

export enum TransactionalGovsgSortField {
  Created = 'created_at',
  Updated = 'updated_at',
}

export interface TimestampFilter {
  createdAt: ComparisonOperator<Date>
}

export interface ComparisonOperator<T> {
  gt?: T
  gte?: T
  lt?: T
  lte?: T
}
