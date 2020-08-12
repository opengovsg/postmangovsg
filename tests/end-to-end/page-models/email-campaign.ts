import { t } from 'testcafe'
import { ReactSelector } from 'testcafe-react-selectors'
import { nextButton, recipientUpload } from './common'
import config from './../../config'

// Normal email template
const subjectInput = ReactSelector('EmailTemplate TextArea').nth(0)
const bodyInput = ReactSelector('EmailTemplate TextArea').nth(1)
const replyToInput = ReactSelector('EmailTemplate TextInput')

// Protected email template
const protectedInput = ReactSelector('ProtectedEmailRecipients TextArea')
const protectedTrimCheckbox = ReactSelector('ProtectedEmailRecipients Checkbox')
const confirmProtectedTemplateButton = ReactSelector(
  'ProtectedEmailRecipients PrimaryButton'
)
  .withText('Confirm')
  .withProps({ disabled: false })
const editMessageButton = ReactSelector('TextButton').withText('Edit Message')
const protectedNextButton = ReactSelector('PrimaryButton').withText('Next')

// Send validation email
const validationEmailInput = ReactSelector(
  'EmailValidationInput TextInputWithButton'
)

// Send campaign
const sendButton = ReactSelector('EmailSend PrimaryButton')
const confirmSendButton = ReactSelector('ConfirmModal PrimaryButton').withText(
  'Confirm send now'
)

/**
 * Create a new email template
 * @param subject Email subject
 * @param body Template body
 * @param replyTo Email to reply to
 */
const createTemplate = async ({
  subject,
  body,
  replyTo,
}: {
  subject: string
  body: string
  replyTo: string
}): Promise<void> => {
  await t.typeText(subjectInput, subject)
  await t.typeText(bodyInput, body)
  await t.typeText(replyToInput, replyTo)

  await t.click(nextButton)
}

/**
 * Create a protected email template
 * @param body Template body
 * @param filename Filename for recipient CSV
 * @param trim Whether to use the trim option for template
 */
const createProtectedTemplate = async ({
  body,
  filename,
  trim = false,
}: {
  body: string
  filename: string
  trim?: boolean
}): Promise<void> => {
  await t.typeText(protectedInput, body)
  if (trim) {
    await t.click(protectedTrimCheckbox)
  }

  await t
    .setFilesToUpload(recipientUpload, filename)
    .click(confirmProtectedTemplateButton)

  // Wait for edit message button to appear to improve stability
  await t
    .expect(editMessageButton.exists)
    .ok({ timeout: config.get('timeout.encrypt') })
    .click(protectedNextButton)
}

/**
 * Upload recipient CSV
 * @param filename Filename for recipient CSV
 */
const uploadRecipient = async ({
  filename,
}: {
  filename: string
}): Promise<void> => {
  await t.setFilesToUpload(recipientUpload, filename)
  await t.click(nextButton)
}

/**
 * Send validation email
 * @param email
 */
const sendValidationEmail = async (email: string): Promise<void> => {
  await t.typeText(validationEmailInput.findReact('TextInput'), email)
  await t.click(validationEmailInput.findReact('PrimaryButton'))
  await t.click(nextButton)
}

/**
 * Send email campaign
 */
const sendCampaign = async (): Promise<void> => {
  await t.click(sendButton)
  await t.click(confirmSendButton)
}

export const EmailCampaignPage = {
  createTemplate,
  createProtectedTemplate,
  uploadRecipient,
  sendValidationEmail,
  sendCampaign,
}
