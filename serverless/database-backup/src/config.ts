import crypto from 'crypto'
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
  'required-hex-string': {
    validate: (val: string): void => {
      if (val === '') {
        throw new Error('Required value cannot be emtpy')
      }

      if (!/^[a-fA-F0-9]+$/.test(val)) {
        throw new Error('Must be an hex string')
      }
    },
    coerce: (val: any): string => {
      if (val === null) return ''
      return val.toString()
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
    backupBucket: {
      doc: 'Name of the S3 bucket to store backups to',
      default: 'postmangovsg-rds-backup-production',
      env: 'BACKUP_BUCKET_NAME',
    },
  },
  encryption: {
    algorithm: {
      doc: 'Encryption algorithm to use to encrypt backup',
      default: 'aes-256-cbc',
      format: crypto.getCiphers(),
      env: 'ENCRYPTION_ALGORITHM',
    },
    key: {
      doc:
        'Symmetric encryption key to use represented as a hexadecimal string',
      default: '',
      format: 'required-hex-string',
      sensitive: true,
      env: 'ENCRYPTION_KEY',
    },
  },
  sentryDsn: {
    doc: 'Sentry DSN for serverless',
    default: '',
    env: 'SENTRY_DSN',
  },
})

switch (config.get('env')) {
  case 'staging':
    config.load({
      aws: {
        backupBucket: 'postmangovsg-rds-backup-staging',
      },
    })
    break
  case 'development':
    config.load({
      aws: {
        backupBucket: 'postmangovsg-rds-backup-dev',
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
