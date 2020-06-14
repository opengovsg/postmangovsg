export enum ChannelType {
  SMS = 'SMS',
  Email = 'EMAIL',
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
  InvalidRecipient = 'INVALID_RECIPIENT',
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
