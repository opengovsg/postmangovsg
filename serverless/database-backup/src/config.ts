import path from 'path'
import convict from 'convict'
import dotenv from 'dotenv'

dotenv.config()

const rdsCaCert = path.join(__dirname, './assets/db-ca.pem')

convict.addFormats({
  'required-string': {
    validate: (val: any): void => {
      if (val === '') {
        throw new Error('Required value cannot be empty')
      }
    },
    coerce: (val: any): any => {
      if (val === null) return ''
      return val
    },
  },
})

const config = convict({
  env: {
    doc: 'The application environment',
    format: ['production', 'staging', 'development'],
    default: 'production',
    env: 'NODE_ENV',
  },
  database: {
    databaseUri: {
      doc: 'URI to the postgres database',
      default: '',
      env: 'DB_URI',
      format: 'required-string',
      sensitive: true,
    },
    useIam: {
      doc: 'Whether to use IAM to authenticate with database',
      default: false,
      format: Boolean,
      env: 'DB_USE_IAM',
    },
    ssl: {
      mode: {
        doc: 'SSL mode to connect to database',
        default: 'verify-ca',
        format: [
          'disable',
          'allow',
          'prefer',
          'require',
          'verify-ca',
          'verify-full',
        ],
        env: 'DB_SSL_MODE',
      },
      cert: {
        doc: 'Path to SSL cert to connect to database',
        default: rdsCaCert,
        format: String,
        sensitive: true,
        env: 'DB_SSL_CERT',
      },
    },
  },
  aws: {
    awsRegion: {
      doc: 'Region for the S3 bucket that is used to store file uploads',
      format: 'required-string',
      default: 'ap-southeast-1',
      env: 'AWS_REGION',
    },
    awsEndpoint: {
      doc:
        'The endpoint to send AWS requests to. If not specified, a default one is made with AWS_REGION',
      format: '*',
      default: null,
      env: 'AWS_ENDPOINT',
    },
  },
  encryption: {
    algorithm: {
      doc: 'Encryption algorithm to use to encrypt backup',
      default: 'aes-256-gcm',
      format: ['aes-128-gcm', 'aes-192-gcm', 'aes-256-gcm'],
      env: 'ENCRYPTION_ALGORITHM',
    },
    keySize: {
      doc: 'Symmetric key size in bytes to be used for encrypting dump',
      default: 32,
      format: Number,
      env: 'ENCRYPTION_KEY_SIZE',
    },
    keyEncryptionPublicKey: {
      doc: 'PEM encoded value for public key used to encrypt symmetric key',
      default: '',
      format: 'required-string',
      sensitive: true,
      env: 'KEY_ENCRYPTION_PUBLIC_KEY',
    },
  },
  gcp: {
    appCredentials: {
      doc: 'Path to GCP service account credentials key file',
      default: '',
      env: 'GOOGLE_APPLICATION_CREDENTIALS',
    },
    backupBucket: {
      doc: 'Name of the S3 bucket to store backups to',
      default: 'ogp-postman-production',
      env: 'BACKUP_BUCKET_NAME',
    },
    secretName: {
      doc: 'Name of secret holding GCP credentials in SecretManager',
      default: 'BackupGcpCredentials-production',
      env: 'GCP_SECRET_NAME',
    },
  },
  sentryDsn: {
    doc: 'Sentry DSN for serverless',
    default: '',
    env: 'SENTRY_DSN',
  },
  cronitor: {
    code: {
      doc: 'Unique cronitor code',
      default: '',
      env: 'CRONITOR_CODE',
    },
  },
})

switch (config.get('env')) {
  case 'staging':
    config.load({
      gcp: {
        backupBucket: 'ogp-postman-staging',
        secretName: 'BackupGcpCredentials-staging',
      },
    })
    break
  case 'development':
    config.load({
      gcp: {
        secretName: 'BackupGcpCredentials-development',
      },
      database: {
        ssl: {
          mode: 'disable',
        },
      },
    })
    break
}

config.validate({ allowed: 'strict' })

export default config
