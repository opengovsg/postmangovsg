export interface CampaignS3ObjectInterface {
  key?: string
  bucket?: string
  filename?: string
  temp_filename?: string
  error?: string
  etag?: string
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
  s3_object?: CampaignS3ObjectInterface
  is_csv_processing: boolean
  protect: boolean
  demo_message_limit: number | null
  should_save_list: boolean
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
  govsg_templates?: {
    id: number
    body: string
    params: Array<string> | null
  }
  job_queue?: {
    status: string
    visible_at?: Date
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
  read?: number
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
