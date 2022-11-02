export enum ChannelType {
  SMS = 'SMS',
  Email = 'EMAIL',
  Telegram = 'TELEGRAM',
}

export enum Status {
  Draft = 'Draft',
  Sending = 'Sending',
  Sent = 'Sent',
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

export enum DefaultCredentialName {
  Email = 'EMAIL_DEFAULT',
  SMS = 'Postman_SMS_Demo',
  Telegram = 'Postman_Telegram_Demo',
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
  // can extend if we want to sort by other fields (to remove and write in PR)
}

export interface TimestampFilter {
  createdAt: DateOperator
  // can extend if we filter by other timestamp (to remove and write in PR)s
}

export interface DateOperator {
  gt: Date
  gte: Date
  lt: Date
  lte: Date
}
/**
 * @swagger
 * components:
 *   schemas:
 *     ChannelType:
 *       type: string
 *       enum:
 *       - SMS
 *       - EMAIL
 *       - TELEGRAM
 *
 *
 *     CampaignMeta:
 *       type: object
 *       properties:
 *         id:
 *          type: number
 *         name:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         has_credential:
 *           type: boolean
 *         valid:
 *           type: boolean
 *         halted:
 *           type: boolean
 *         protect:
 *           type: boolean
 *         redacted:
 *           type: boolean
 *         should_save_list:
 *           type: boolean
 *         type:
 *           $ref: '#/components/schemas/ChannelType'
 *         job_queue:
 *           type: array
 *           items:
 *            $ref: '#/components/schemas/JobQueue'
 *
 *     CampaignDuplicateMeta:
 *       type: object
 *       required:
 *         - name
 *         - id
 *         - created_at
 *         - type
 *         - protect
 *       properties:
 *         id:
 *           type: number
 *         name:
 *           type: string
 *         type:
 *           $ref: '#/components/schemas/ChannelType'
 *         created_at:
 *           type: string
 *           format: date-time
 *         protect:
 *           type: boolean
 *           example: false
 *
 *     JobQueue:
 *        type: object
 *        properties:
 *          status:
 *            $ref: '#/components/schemas/JobStatus'
 *          sent_at:
 *            type: string
 *            format: date-time
 *          status_updated_at:
 *            type: string
 *            format: date-time
 *
 *     JobStatus:
 *       type: string
 *       enum:
 *       - READY
 *       - ENQUEUED
 *       - SENDING
 *       - SENT
 *       - STOPPED
 *       - LOGGED
 */
