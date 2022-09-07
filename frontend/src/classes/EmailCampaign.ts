import { i18n } from '@lingui/core'
import { t } from '@lingui/macro'
import { get } from 'lodash'

import { Campaign, CampaignRecipient } from './Campaign'

const emailErrors = {
  'Hard bounce': t`errors.email.hardBounce`,
  'Soft bounce': t`errors.email.softBounce`,
  'Recipient is incorrectly formatted': t`errors.email.invalidFormat`,
  abuse: t`errors.email.complaint`,
}

export enum EmailProgress {
  CreateTemplate,
  UploadRecipients,
  SendTestMessage,
  Send,
}

export interface EmailPreview {
  body: string
  themedBody: string
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
  showLogo: boolean
  csvFilename: string
  numRecipients: number
  hasCredential: boolean
  agencyName: string
  agencyLogoURI: string
  themedBody: string
  progress: EmailProgress = EmailProgress.CreateTemplate
  unsubscriber: string
  unsubscribeReason: string

  constructor(input: any) {
    super(input)
    this.body = input['email_templates']?.body
    this.params = input['email_templates']?.params
    this.subject = input['email_templates']?.subject
    this.replyTo = input['email_templates']?.reply_to
    this.from = input['email_templates']?.from
    this.showLogo = input['email_templates']?.show_logo
    this.themedBody = input['email_templates']?.themed_body
    this.csvFilename = input['csv_filename']
    this.numRecipients = input['num_recipients']
    this.hasCredential = input['has_credential']
    this.agencyName = input['user']?.domain?.agency?.name
    this.agencyLogoURI = input['user']?.domain?.agency?.logo_uri
    this.unsubscriber = input['unsubscriber.recipient']
    this.unsubscribeReason = input['unsubscriber.reason'] || ''
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
    const blacklistMsg = t`errors.email.blacklist`
    let formatted = ''
    switch (this.status) {
      case 'SENDING':
      case 'SUCCESS':
      case 'READ':
        return ''
      case 'INVALID_RECIPIENT':
        // If error code is null and status is invalid, the email has been blacklisted. Otherwise, the error has not been mapped.
        formatted =
          errorCode !== null
            ? get(emailErrors, errorCode, errorCode)
            : blacklistMsg
        return i18n._(formatted)
    }

    return errorCode
  }
}
