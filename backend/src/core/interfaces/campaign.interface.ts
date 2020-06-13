import { ChannelType } from '@core/constants'

export interface CampaignS3ObjectInterface {
  key: string
  bucket: string
  filename: string
}

export interface CampaignInterface {
  name: string
  userId: number
  type: ChannelType
  credName?: string
  s3Object?: CampaignS3ObjectInterface
  valid: boolean
}

export interface CampaignDetails {
  id: string
  name: string
  type: string
  created_at: Date
  valid: boolean
  has_credential: boolean
  csv_filename: string
  num_recipients: number
  email_templates?: {
    body: string
    subject: string
    replyTo: string | null
  }
  sms_templates?: {
    body: string
  }
  job_queue?: {
    status: string
  }
}

export interface CampaignStats extends CampaignStatsCount {
  status: string
}

export interface CampaignStatsCount {
  error: number
  unsent: number
  sent: number
  invalid: number
}
/**
 * @swagger
 *  components:
 *    schemas:
 *      CampaignStats:
 *        type: object
 *        properties:
 *          error:
 *            type: number
 *          unsent:
 *            type: number
 *          sent:
 *            type: number
 *          status:
 *            $ref: '#/components/schemas/JobStatus'
 */
