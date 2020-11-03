import convict from 'convict'
import dotenv from 'dotenv'
dotenv.config()

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
    coerce: (val: any): any => {
      if (val === null) {
        return undefined
      }
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
  prefix: {
    doc: 'prefix of secret id',
    default: 'env/eb/',
    env: 'PREFIX',
  },
  secretId: {
    doc: 'Id of secret that got updated',
    default: '',
    env: 'SECRET_ID',
    format: 'required-string',
  },
  aws: {
    awsRegion: {
      doc: 'Region for where the lambda will be deployed in.',
      default: 'ap-southeast-1',
      env: 'AWS_REGION',
    },
  },
  sentryDsn: {
    doc: 'Sentry DSN for serverless',
    default: '',
    env: 'SENTRY_DSN',
  },
})

config.validate({ allowed: 'strict' })

export default config
