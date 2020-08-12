import convict from 'convict'

/**
 * To require an env var without setting a default,
 * use
 *    default: '',
 *    format: 'required-string',
 *    sensitive: true,
 */
convict.addFormats({
  'required-string': {
    validate: (val: any): void => {
      if (val === '') {
        throw new Error('Required value cannot be empty')
      }
    },
  },
})

const config = convict({
  testFiles: {
    doc: 'Comma separated list of file patterns to chose which tests to run.',
    default: 'tests/',
    format: String,
    arg: 'test-files',
  },
  liveMode: {
    doc: 'Whether to run live mode for testcafe',
    default: false,
    format: Boolean,
    arg: 'live-mode',
  },
  backendUrl: {
    doc: 'URL to backend API',
    default: 'http://localhost:4000',
    env: 'TEST_BACKEND_URL',
  },
  frontendUrl: {
    doc: 'URL to frontend',
    default: 'http://localhost:3000',
    env: 'TEST_FRONTEND_URL',
  },
  tls: {
    cert: {
      doc: 'Path to TLS certificate',
      default: 'certs/cert.pem',
      env: 'TEST_TLS_CERT',
    },
    key: {
      doc: 'Path to TLS certificate key',
      default: 'certs/key.pem',
      env: 'TEST_TLS_KEY',
    },
  },
  database: {
    databaseUri: {
      doc: 'URI to the postgres database',
      default: '',
      env: 'TEST_DB_URI',
      format: 'required-string',
      sensitive: true,
    },
  },
  timeout: {
    encrypt: {
      doc: 'Timeout value in ms for encryption of protected messages',
      default: 60000,
      format: Number,
      env: 'TEST_TIMEOUT_ENCRYPT',
    },
    next: {
      doc: 'Timeout value in ms for next button to be available',
      default: 60000,
      format: Number,
      env: 'TEST_TIMEOUT_NEXT',
    },
    sendComplete: {
      doc: 'Timeout value in ms for campaign to complete sending',
      default: 60000,
      format: Number,
      env: 'TEST_TIMEOUT_SEND_COMPLETE',
    },
  },
  testCredentials: {
    sms: {
      accountSid: {
        doc: 'Test Twilio account SID',
        env: 'TEST_TWILIO_ACCOUNT_SID',
        default: '',
        format: 'required-string',
        sensitive: true,
      },
      apiSecret: {
        doc: 'Test API Secret to access Twilio',
        env: 'TEST_TWILIO_API_SECRET',
        default: '',
        format: 'required-string',
        sensitive: true,
      },
      messagingServiceSid: {
        doc: 'ID of the messaging service ',
        default: '+15005550006',
        env: 'TEST_TWILIO_MESSAGING_SERVICE_SID',
        sensitive: true,
      },
    },
  },
})

export default config
