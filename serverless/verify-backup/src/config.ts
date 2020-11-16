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
  gcloudBackupBucket: {
    doc: 'Name of Google Cloud Storage bucket that stores db backups',
    default: '',
    env: 'GCLOUD_BACKUP_BUCKET',
    format: 'required-string',
  },
  gcloudCredentials: {
    doc: 'Path to service account key JSON used to authenticate gcloud',
    default: '',
    env: 'GOOGLE_APPLICATION_CREDENTIALS',
  },
  gcloudProjectId: {
    doc: 'Project id of the current Google Cloud Project',
    default: '',
    env: 'GCLOUD_PROJECT_ID',
    format: 'required-string'
  },
  gcloudLocationId: {
    doc: 'Location id of where the Google Cloud Bucket is hosted',
    default: '',
    env: 'GCLOUD_LOCATION_ID',
    format: 'required-string'
  },
  gcloudPrivateKeyResourceId: {
    doc: 'Resource id of the private key from Google Cloud KMS used to decrypt db dumps',
    default: '',
    env: 'GCLOUD_PRIVATE_KEY_RESOURCE_ID',
    format: 'required-string'
  },
  gcloudBackupKeyResourceId: {
    doc: 'Resource id of the backup service account key in Google Cloud Secrets Manager',
    default: '',
    env: 'GCLOUD_BACKUP_KEY_RESOURCE_ID',
    format: 'required-string'
  }
})

config.validate({ allowed: 'strict' })

export default config
