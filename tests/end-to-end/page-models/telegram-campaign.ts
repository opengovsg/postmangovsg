import { t } from 'testcafe'
import { ReactSelector } from 'testcafe-react-selectors'
import { nextButton, recipientUpload } from './common'

// Telegram template
const bodyInput = ReactSelector('TelegramTemplate TextArea').nth(0)

// Telegram credentials
const telegramCredentialsInput = ReactSelector(
  'TelegramCredentialsInput TextInput'
)
const validateCredentialsButton = ReactSelector(
  'TelegramCredentials PrimaryButton'
)
  .withText('Validate credentials')
  .withProps({ disabled: false })
const validationNumberInput = ReactSelector(
  'TelegramValidationInput TextInputWithButton'
)

// Send campaign
const sendButton = ReactSelector('TelegramSend PrimaryButton')
const confirmSendButton = ReactSelector('ConfirmModal PrimaryButton').withText(
  'Confirm send now'
)

/**
 * Create a new Telegram template
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
 * @param botToken Test bot token
 * @param phoneNumber Recipient to use for testing of bot token
 */
const enterAndValidateNewCredentials = async ({
  botToken,
  phoneNumber,
}: {
  botToken: string
  phoneNumber: string
}): Promise<void> => {
  await t
    .typeText(telegramCredentialsInput.nth(0), botToken)
    .click(validateCredentialsButton)

  await t
    .typeText(validationNumberInput, phoneNumber)
    .click(validationNumberInput.findReact('PrimaryButton'))

  await t.click(nextButton)
}

/**
 * Send Telgram campaign
 */
const sendCampaign = async (): Promise<void> => {
  await t.click(sendButton)
  await t.click(confirmSendButton)
}

export const TelegramCampaignPage = {
  createTemplate,
  uploadRecipient,
  enterAndValidateNewCredentials,
  sendCampaign,
}
