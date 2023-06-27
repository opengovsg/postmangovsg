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

export interface TimestampFilter {
  createdAt: ComparisonOperator<Date>
}

export interface ComparisonOperator<T> {
  gt?: T
  gte?: T
  lt?: T
  lte?: T
}
