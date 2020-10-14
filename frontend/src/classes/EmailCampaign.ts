import { get } from 'lodash'
import { t } from '@lingui/macro'
import { i18n } from 'locales'
import { Campaign, CampaignRecipient } from './Campaign'

const emailErrors = {
  'Hard bounce': t('errors.email.hardBounce')``,
  'Soft bounce': t('errors.email.softBounce')``,
  'Recipient is incorrectly formatted': t('errors.email.invalidFormat')``,
}

export enum EmailProgress {
  CreateTemplate,
  UploadRecipients,
  SendTestMessage,
  Send,
}

export interface EmailPreview {
  body: string
  subject: string
  replyTo: string | null
  from: string
}

export class EmailCampaign extends Campaign {
  body: string
  params: Array<string>
  subject: string
  replyTo: string | null
  from: string
  csvFilename: string
  numRecipients: number
  hasCredential: boolean
  progress: EmailProgress = EmailProgress.CreateTemplate

  constructor(input: any) {
    super(input)
    this.body = input['email_templates']?.body
    this.params = input['email_templates']?.params
    this.subject = input['email_templates']?.subject
    this.replyTo = input['email_templates']?.reply_to
    this.from = input['email_templates']?.from
    this.csvFilename = input['csv_filename']
    this.numRecipients = input['num_recipients']
    this.hasCredential = input['has_credential']
    this.setProgress()
  }

  setProgress() {
    if (!this.body || !this.subject) {
      this.progress = EmailProgress.CreateTemplate
    } else if (!this.numRecipients) {
      this.progress = EmailProgress.UploadRecipients
    } else if (!this.hasCredential) {
      this.progress = EmailProgress.SendTestMessage
    } else {
      this.progress = EmailProgress.Send
    }
  }
}

export class EmailCampaignRecipient extends CampaignRecipient {
  formatErrorCode(errorCode: string): string {
    if (this.status !== 'SUCCESS') {
      const complaintMsg = t('errors.email.complaint')``
      const blacklistMsg = t('errors.email.blacklist')``

      // If error code is null and status is invalid, the email has been blacklisted. Otherwise, it's returned from a complaint.
      const formatted =
        errorCode !== null
          ? get(emailErrors, errorCode, complaintMsg)
          : blacklistMsg
      return i18n._(formatted)
    }

    return errorCode
  }
}
