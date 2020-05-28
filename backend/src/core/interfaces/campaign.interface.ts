import { ChannelType } from '@core/constants'

export interface CampaignS3ObjectInterface {
  key?: string
  bucket?: string
  filename?: string
  temp_filename?: string
  error?: string
}

export interface CsvStatusInterface {
  isCsvProcessing: boolean
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
  is_csv_processing: boolean
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

export interface CampaignInvalidRecipient {
    recipient: string,
    messageId: string
    errorCode: string,
    sentAt: Date,
    updatedAt: Date
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
 *          invalid:
 *            type: number
 *          status:
 *            $ref: '#/components/schemas/JobStatus'
 */
