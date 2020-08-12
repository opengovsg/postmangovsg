import { t } from 'testcafe'
import { ReactSelector } from 'testcafe-react-selectors'
import { nextButton, recipientUpload } from './common'

// SMS template
const bodyInput = ReactSelector('SMSTemplate TextArea').nth(0)

// SMS credentials
const twilioCredentialsInput = ReactSelector('TwilioCredentialsInput TextInput')
const validationNumberInput = ReactSelector(
  'EmailValidationInput TextInputWithButton'
)

// Send campaign
const showSendRate = ReactSelector('SendRate')
const sendRateInput = ReactSelector('SendRate TextInput')
const sendButton = ReactSelector('SMSSend PrimaryButton')
const confirmSendButton = ReactSelector('ConfirmModal PrimaryButton').withText(
  'Confirm send now'
)

/**
 * Create a new SMS template
 * @param body Template body
 */
const createTemplate = async ({ body }: { body: string }): Promise<void> => {
  await t.typeText(bodyInput, body)
  await t.click(nextButton)
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
 * Enter and validate a new set of Twilio credentials
 * @param accountSid Twilio test account SID
 * @param apiSecret Twilio test API secret
 * @param messagingServiceSid SID to use for sending message
 * @param phoneNumber Recipient to use for validation of credentials
 */
const enterAndValidateNewCredentials = async ({
  accountSid,
  apiSecret,
  messagingServiceSid,
  phoneNumber,
}: {
  accountSid: string
  apiSecret: string
  messagingServiceSid: string
  phoneNumber: string
}): Promise<void> => {
  await t
    .typeText(twilioCredentialsInput.nth(0), accountSid)
    .typeText(twilioCredentialsInput.nth(1), accountSid)
    .typeText(twilioCredentialsInput.nth(2), apiSecret)
    .typeText(twilioCredentialsInput.nth(3), messagingServiceSid)

  await t
    .typeText(validationNumberInput, phoneNumber)
    .click(validationNumberInput.findReact('PrimaryButton'))

  await t.click(nextButton)
}

/**
 * Send SMS campaign
 */
const sendCampaign = async (sendRate = 1): Promise<void> => {
  await t.click(showSendRate).typeText(sendRateInput, `${sendRate}`)
  await t.click(sendButton)
  await t.click(confirmSendButton)
}

export const SmsCampaignPage = {
  createTemplate,
  uploadRecipient,
  enterAndValidateNewCredentials,
  sendCampaign,
}
