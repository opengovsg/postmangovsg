import { ChannelType } from '@core/constants'

export interface CampaignS3ObjectInterface {
  key?: string
  bucket?: string
  filename?: string
  tempFilename?: string
  error?: string
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

export interface GetCampaignDetailsOutput {
  campaign: CampaignDetails
  numRecipients: number
}
export interface CampaignStats {
  error: number
  unsent: number
  sent: number
  status: string
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
