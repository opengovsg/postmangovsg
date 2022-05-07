// Dayjs settings - this file should be imported into the entry point of lambdas.
import convict from 'convict'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isBetween from 'dayjs/plugin/isBetween'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isBetween)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('europe/paris')

const isProduction = process.env.ENV === 'production'

// TODO: update with postmangovsg's variables
export const config = convict({
  local: {
    doc: 'Whether code is being executed locally',
    default: false,
    env: 'LOCAL',
  },
  env: {
    doc: 'The application environment.',
    format: ['production', 'staging'],
    default: 'staging',
    env: 'ENV',
  },
  region: {
    doc: 'AWS region',
    default: 'ap-southeast-1',
  },
  mailer: {
    doc: 'nodemailer - emails',
    env: 'MAILER',
    default: {
      host: '',
      port: 0,
      auth: {
        user: '',
        pass: '',
      },
    },
  },
  postmark: {
    apiKey: {
      env: 'POSTMARK_API_KEY',
      default: '',
    },
  },
  protocol: {
    singleSubmission: {
      formSecretKey: {
        env: 'SINGLE_PROTOCOL_FORM_SECRET_KEY',
        default: '',
      },
      formPostUrl: {
        default: isProduction
          ? 'https://api.vaccine.gov.sg/single-protocol'
          : 'https://api-staging.vaccine.gov.sg/single-protocol',
      },
    },
    bulkSubmission: {
      formSecretKey: {
        env: 'BULK_PROTOCOL_FORM_SECRET_KEY',
        default: '',
      },
      formPostUrl: {
        default: isProduction
          ? 'https://api.vaccine.gov.sg/bulk-protocol'
          : 'https://api-staging.vaccine.gov.sg/bulk-protocol',
      },
    },
  },
  idgowhere: {
    url: {
      default: 'https://api.identity.gowhere.gov.sg',
    },
    credentials: {
      url: {
        default:
          'https://identity-api.auth.ap-southeast-1.amazoncognito.com/oauth2/token?grant_type=client_credentials',
      },
      auth: {
        username: {
          env: 'IDGOWHERE_CLIENT_ID',
          default: '',
        },
        password: {
          env: 'IDGOWHERE_CLIENT_SECRET',
          default: '',
        },
      },
    },
  },
  preregistration: {
    form: {
      formSecretKey: {
        env: 'PREREGISTRATION_FORM_SECRET_KEY',
        default: '',
      },
      formPostUrl: {
        default: isProduction
          ? 'https://api.vaccine.gov.sg/preregister'
          : 'https://api-staging.vaccine.gov.sg/preregister',
      },
    },
    dbUri: {
      env: 'PREREGISTRATION_DB_URI',
      default: '',
    },
  },
  record: {
    url: {
      default: isProduction
        ? 'https://record.vaccine.gov.sg/api/v1'
        : 'https://record-staging.vaccine.gov.sg/api/v1',
    },
    apiKey: {
      env: 'RECORD_API_KEY',
      default: '',
    },
    dbUri: {
      env: 'RECORD_DB_URI',
      default: '',
    },
  },
  art: {
    doc: 'Configurations for accessing ART (moh-cmb-api) server or DB',
    dbUri: {
      env: 'ART_DB_URI',
      default: '',
    },
  },
  clinic: {
    doc: 'Configurations for accessing clinic server or DB',
    dbUri: {
      env: 'CLINIC_DB_URI',
      default: '',
    },
  },
  appointment: {
    doc: 'Configurations for accessing appointments server or DB',
    url: {
      default: isProduction
        ? 'https://appointment.vaccine.gov.sg/api/v1'
        : 'https://appointment-staging.vaccine.gov.sg/api/v1',
    },
    apiKey: {
      env: 'APPOINTMENT_API_KEY',
      default: '',
    },
    dbUri: {
      env: 'APPOINTMENT_DB_URI',
      default: '',
    },
    bookingCodeUrl: {
      default: isProduction
        ? 'https://appointment.vaccine.gov.sg/?code='
        : 'https://appointment-staging.vaccine.gov.sg/?code=',
    },
  },
  nir: {
    doc: 'Consuming 3-hourly vaccination SFTP with decryption',
    bucketName: {
      default: isProduction
        ? 'vaccinegovsg-nir-uploads'
        : 'vaccinegovsg-nir-uploads-staging',
    },
    errorDdbTablename: {
      default: isProduction
        ? 'vaccinegovsg-serverless-production-nir-ingestion-errors'
        : 'vaccinegovsg-serverless-staging-nir-ingestion-errors',
    },
    sliftPassword: {
      env: 'NIR_SLIFT_PASSWORD',
      default: '',
    },
    verificationEmails: {
      env: 'NIR_VERIFICATION_EMAILS',
      default: 'verifications@vaccine.gov.sg',
    },
    sftpReadFolder: {
      default: '/HOME/out/',
    },
  },
  cms: {
    doc: 'Consuming 3-hourly Covid / Serology SFTP with decryption',
    bucketName: {
      default: isProduction
        ? 'vaccinegovsg-cms-uploads'
        : 'vaccinegovsg-cms-uploads-staging',
    },
    ddbTableName: {
      default: isProduction
        ? 'vaccinegovsg-cms-uploads'
        : 'vaccinegovsg-cms-uploads-staging',
    },
    sliftPassword: {
      env: 'CMS_SLIFT_PASSWORD',
      default: '',
    },
    verificationEmails: {
      // We only send to ourselves
      env: 'CMS_VERIFICATION_EMAILS',
      default: 'verifications@vaccine.gov.sg',
    },
    sftpReadFolder: {
      default: '/HOME/CMB/OUT/',
    },
    errorDdbTablename: {
      default: isProduction
        ? 'vaccinegovsg-serverless-production-cms-ingestion-errors'
        : 'vaccinegovsg-serverless-staging-cms-ingestion-errors',
    },
  },
  twilio: {
    apiKey: {
      env: 'TWILIO_API_KEY',
      default: '',
    },
    apiSecret: {
      env: 'TWILIO_API_SECRET',
      default: '',
    },
    accountSid: {
      env: 'TWILIO_ACCOUNT_SID',
      default: '',
    },
    messagingSid: {
      env: 'TWILIO_MESSAGING_SID',
      default: '',
    },
  },
  tz: {
    default: 'Asia/Singapore',
    doc: 'Timezone used by Dayjs.',
  },
})
  .validate()
  .getProperties()
