// User credentials
export const TWILIO_CREDENTIAL = 'test-twilio-cred'
export const TELEGRAM_CREDENTIAL = 'test-telegram-cred'
export const INVALID_TWILIO_CREDENTIAL = 'invalid-test-twilio-cred'
export const INVALID_TELEGRAM_CREDENTIAL = 'invalid-test-telegram-cred'

// Email addresses
export const USER_EMAIL = 'testEmail@open.gov.sg'
export const DEFAULT_FROM = 'Postman Test <donotreply@test.postman.gov.sg>'

// Recipient uploads
export const VALID_CSV_FILENAME = 'test_valid_recipients.csv'
export const INVALID_CSV_FILENAME = 'test_invalid_recipients.csv'
export const RECIPIENT_NUMBER = '89898989'
export const RECIPIENT_EMAIL = 'testEmailRecipient@gmail.com'
export const PROTECTED_PASSWORD = 'test password'
export const INVALID_EMAIL_CSV_FILE = new File(
  [`invalid_column\nInvalid Column Value`],
  INVALID_CSV_FILENAME,
  {
    type: 'text/csv',
  }
)
export const VALID_EMAIL_CSV_FILE = new File(
  [`recipient,password\n${RECIPIENT_EMAIL},${PROTECTED_PASSWORD}`],
  VALID_CSV_FILENAME,
  {
    type: 'text/csv',
  }
)
export const VALID_MOBILE_CSV_FILE = new File(
  [`recipient\n${RECIPIENT_NUMBER}`],
  VALID_CSV_FILENAME,
  {
    type: 'text/csv',
  }
)
export const INVALID_MOBILE_CSV_FILE = new File(
  [`invalid_column\nInvalid Column Value`],
  INVALID_CSV_FILENAME,
  {
    type: 'text/csv',
  }
)

export const PRESIGNED_URL =
  'https://s3.ap-southeast-1.amazonaws.com/file-test.postman.gov.sg/test_params'
