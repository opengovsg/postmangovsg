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

export interface CampaignDetails {
  id: string
  name: string
  type: string
  created_at: Date
  valid: boolean
  has_credential: boolean
  csv_filename: string
  is_csv_processing: boolean
  protect: boolean
  demo_message_limit: number | null
  num_recipients: number
  redacted?: boolean
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
  user?: {
    domain?: {
      agency?: {
        logo_uri: string
        name: string
      }
    }
  }
  cost_per_message?: number
}

export interface CampaignStats extends CampaignStatsCount {
  status: string
  halted: boolean | null
  status_updated_at?: Date
  wait_time?: number
}

export interface CampaignStatsCount {
  error: number
  unsent: number
  sent: number
  invalid: number
  updated_at: Date
  unsubscribed?: number // only applicable for email stats
}

export interface CampaignRecipient {
  recipient: string
  status: string
  updated_at: Date
  error_code?: string
}

export interface DuplicateCampaignDetails {
  name: string
  type: string
  user_id: number
  protect: boolean
  demo_message_limit: number | null
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
 *          halted:
 *            type: boolean
 *          redacted:
 *            type: boolean
 *          status:
 *            $ref: '#/components/schemas/JobStatus'
 *          updated_at:
 *            type: string
 *            format: date-time
 *      CampaignRecipient:
 *        type: object
 *        properties:
 *          recipient:
 *            type: string
 *          status:
 *            type: string
 *          updated_at:
 *            type: string
 *            format: date-time
 *          error_code:
 *            type: string
 */
