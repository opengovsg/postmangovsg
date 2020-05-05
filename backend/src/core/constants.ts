export enum ChannelType {
  SMS = 'SMS',
  Email = 'EMAIL'
}

export enum JobStatus {
  Ready = 'READY',
  Enqueued = 'ENQUEUED',
  Sending = 'SENDING',
  Sent = 'SENT',
  Stopped = 'STOPPED',
  Logged = 'LOGGED'
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
 *     Campaign:
 *       type: object
 *
 *     CampaignMeta:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         hasCredential:
 *           type: boolean
 *         valid:
 *           type: boolean
 *         type:
 *           $ref: '#/components/schemas/ChannelType'
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

