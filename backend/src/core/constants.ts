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

export enum SortField {
  Created = 'created_at',
  Sent = 'sent_at',
}

export enum Ordering {
  ASC = 'ASC',
  DESC = 'DESC',
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
 *         type:
 *           $ref: '#/components/schemas/ChannelType'
 *         job_queue:
 *           type: array
 *           items:
 *            $ref: '#/components/schemas/JobQueue'
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
