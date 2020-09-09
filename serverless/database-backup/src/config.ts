import path from 'path'
import convict from 'convict'
import dotenv from 'dotenv'

dotenv.config()

const rdsCaCert = path.join(__dirname, './assets/db-ca.pem')

convict.addFormat({
  name: 'required',
  validate: (val: string | number) => {
    if (!val) {
      throw new Error('Required value cannot be empty')
    }
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
      format: 'required',
      sensitive: true,
    },
    useIam: {
      doc: 'Whether to use IAM to authenticate with database',
      default: false,
      format: Boolean,
      env: 'DB_USE_IAM',
    },
    ssl: {
      require: {
        doc: 'Whether to require SSL to connect to database',
        default: false,
        format: Boolean,
        env: 'DB_REQUIRE_SSL',
      },
      mode: {
        doc: 'SSL mode to connect to database',
        default: 'verify-full',
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
      format: 'required',
      default: 'postmangovsg-prod-backup',
      env: 'BACKUP_BUCKET_NAME',
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
        backupBucket: 'postmangovsg-staging-backup',
      },
    })
    break
  case 'development':
    config.load({
      aws: {
        backupBucket: 'postmangovsg-dev-backup',
      },
      database: {
        ssl: {
          require: false,
        },
      },
    })
    break
}

config.validate({ allowed: 'strict' })

export default config
