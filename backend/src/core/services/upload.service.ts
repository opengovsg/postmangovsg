import Queue from 'bee-queue'
import { v4 as uuid } from 'uuid'
import { difference, keys } from 'lodash'
import retry from 'async-retry'

import { PutObjectCommand, S3 } from '@aws-sdk/client-s3'
import { Transaction } from 'sequelize'

import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { isSuperSet } from '@core/utils'
import { MissingTemplateKeysError } from '@core/errors/template.errors'
import { configureEndpoint } from '@core/utils/aws-endpoint'
import { jwtUtils } from '@core/utils/jwt'
import { Campaign } from '@core/models'
import {
  AllowedTemplateTypes,
  CsvStatusInterface,
  Upload,
  UploadData,
} from '@core/interfaces'
import { CSVParams } from '@core/types'
import S3Client from '@core/services/s3-client.class'
import { CampaignService, ParseCsvService, StatsService } from '.'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const logger = loggerWithLabel(module)

const RETRY_CONFIG = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 3 * 1000,
  factor: 1,
}
const FILE_STORAGE_BUCKET_NAME = config.get('aws.uploadBucket')
const s3 = new S3({ ...configureEndpoint(config) })

let uploadQueue: Queue<Upload> | undefined

/**
 * Returns a presigned url for uploading file to s3 bucket
 * @param contentType
 */
const getUploadParameters = async (
  contentType: string,
  md5?: string
): Promise<{ presignedUrl: string; signedKey: string }> => {
  const s3Key = uuid()

  const params = {
    Bucket: FILE_STORAGE_BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType,
    ...(md5 ? { ContentMD5: md5 } : {}),
  }

  const signedKey = jwtUtils.sign(s3Key)

  const presignedUrl = await getSignedUrl(s3, new PutObjectCommand(params), {
    expiresIn: 180, // seconds
  })

  return { presignedUrl, signedKey }
}

/**
 * Returns a presigned url for uploading file to s3 bucket
 * Used as a passthrough function as we just need to generate the url
 * to gain access to postman bucket, for other services , e.g. phonebook
 * to upload the managed list
 */
const getPresignedUrl = async (): Promise<{
  presignedUrl: string
}> => {
  const s3Key = uuid()

  const params = {
    Bucket: FILE_STORAGE_BUCKET_NAME,
    Key: s3Key,
  }
  const presignedUrl = await getSignedUrl(s3, new PutObjectCommand(params), {
    expiresIn: 180, // seconds
  })
  return { presignedUrl }
}

/**
 * Decodes jwt
 * @param transactionId
 */
const extractParamsFromJwt = (
  transactionId: string
): { s3Key: string; uploadId?: string } => {
  let decoded
  try {
    decoded = jwtUtils.verify(transactionId)
  } catch (err) {
    throw new Error('Invalid transactionId provided')
  }
  return typeof decoded === 'string'
    ? { s3Key: decoded }
    : (decoded as { s3Key: string; uploadId: string }) //multipart
}

/**
 * On file upload complete, save the transaction id and file name against the campaign so that we can download the file from s3 later
 */
const replaceCampaignS3Metadata = (
  campaignId: number,
  key: string,
  filename: string,
  transaction: Transaction | undefined
): Promise<[number, Campaign[]]> => {
  return Campaign.update(
    {
      s3Object: {
        key,
        filename,
        bucket: FILE_STORAGE_BUCKET_NAME,
      },
    },
    {
      where: {
        id: campaignId,
      },
      returning: true,
      transaction,
    }
  )
}

/*
 * On file upload processing start, store temp filename in s3 object
 * and delete error string if present
 */
const storeS3TempFilename = async (
  campaignId: number,
  tempFilename: string
): Promise<void> => {
  return Campaign.updateS3ObjectKey(campaignId, {
    temp_filename: tempFilename,
    error: undefined,
  })
}

/*
 * On file upload processing failed, store error string in s3 object
 */
const storeS3Error = async (
  campaignId: number,
  error: string
): Promise<void> => {
  try {
    await Campaign.updateS3ObjectKey(campaignId, { error })
  } catch (e) {
    logger.error({
      message: 'Error storing error string in s3object for campaign',
      campaignId,
      error: e,
      action: 'storeS3Error',
    })
  }
}

/*
 * Remove temp keys in s3 object
 */
const deleteS3TempKeys = async (campaignId: number): Promise<void> => {
  return Campaign.updateS3ObjectKey(campaignId, {
    temp_filename: undefined,
    error: undefined,
  })
}

/*
 * Returns status of csv processing
 * If tempFilename exists in S3Object without errors, processing is still ongoing
 * If error exists in S3Object, processing has failed
 * If neither exists, processing is complete
 * If lastUpdated timestamp on campaign has exceeded csvProcessingTimeout, consider processing timedout
 */
const getCsvStatus = async (
  campaignId: number
): Promise<CsvStatusInterface> => {
  const campaign = await Campaign.findByPk(campaignId)
  if (!campaign) {
    throw new Error('Campaign does not exist')
  }
  // s3Object is nullable
  const { filename, temp_filename: tempFilename } = campaign.s3Object || {}
  const { error } = campaign.s3Object || {}
  const isCsvProcessing = !!tempFilename && !error

  return {
    isCsvProcessing,
    filename,
    tempFilename,
    error,
  }
}

/*
 * Ensures that the csv contains all the columns necessary to replace the attributes in the template
 * @param csvContent
 * @param templateParams
 */
const checkTemplateKeysMatch = (
  csvContent: Array<CSVParams>,
  templateParams: Array<string>
): void => {
  const csvRecord = csvContent[0]
  if (!isSuperSet(keys(csvRecord), templateParams)) {
    const missingKeys = difference(templateParams, keys(csvRecord))
    throw new MissingTemplateKeysError(missingKeys)
  }
}
/**
 * For campaign table, the s3 meta data is updated with the uploaded file, and its validity is set to true.
 * update statistics with new unsent count
 * @param param.transaction
 * @param param.campaignId
 * @param param.key
 * @param param.filename
 */
const onComplete = ({
  transaction,
  campaignId,
  key,
  filename,
}: {
  transaction: Transaction
  campaignId: number
  key: string
  filename: string
}): ((numRecords: number) => Promise<void>) => {
  return async (numRecords: number): Promise<void> => {
    // Updates metadata in project
    await replaceCampaignS3Metadata(campaignId, key, filename, transaction)

    await StatsService.setNumRecipients(campaignId, numRecords, transaction)

    // Set campaign to valid
    await CampaignService.setValid(campaignId, transaction)
    await transaction?.commit()
  }
}

/**
 * Get or create upload queue
 * @return uploadQueue - Queue holding all upload jobs
 */
const getUploadQueue = async (): Promise<Queue<Upload>> => {
  if (!uploadQueue) {
    uploadQueue = new Queue<Upload>(config.get('upload.queueName'), {
      redis: config.get('upload.redisUri'),
      removeOnSuccess: true,
    })
    await uploadQueue.ready()
  }

  return uploadQueue
}

/**
 * Enqueue a new upload job for processing
 * @param upload - Upload holding channel type and upload data
 * @return jobId
 */
const enqueueUpload = async (upload: Upload): Promise<string> => {
  const queue = await getUploadQueue()
  // set job id to be campaign ID just in case a duplicate job is created while
  // another job for the same campaign is being processed, the duplicate job won't
  // be created
  const job = queue.createJob(upload).setId(upload.data.campaignId.toString())
  // Retries are already handled within the processing function, hence we set it to zero
  const saved = await job.retries(0).save()
  return saved.id
}

/**
 * Retrieve a previously enqueued upload job
 * @param id - ID of the previously enqueued upload job
 * @return uploadJob
 */
const getUpload = async (id: string): Promise<Upload> => {
  const queue = await getUploadQueue()
  const job = await queue.getJob(id)
  if (!job) throw new Error(`Unable to find upload ${id}`)
  return job.data
}

async function pgAdvisoryLockCampaign(
  id: number,
  transaction: Transaction
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [[isProcessingByAnother]] = await Campaign.sequelize!.query(
    'SELECT pg_try_advisory_xact_lock(?)',
    {
      replacements: [id],
      transaction,
    }
  )
  const isAcquired = (
    isProcessingByAnother as { pg_try_advisory_xact_lock: boolean }
  ).pg_try_advisory_xact_lock
  logger.info({
    message: '[uploadService.pgAdvisoryLockCampaign] Acquiring advisory lock',
    isAcquired,
    id,
  })

  return isAcquired
}
/**
 * Create channel specific function for processing uploads
 * @param onPreview - Function that returns function to call to preview recipient rows
 * @param onChunk - Function that returns function to call to process and store recipient rows
 * @return processUpload - Function that processes an upload
 */
const processUpload = <Template extends AllowedTemplateTypes>(
  onPreview: (params: {
    transaction: Transaction
    template: Template
    campaignId: number
  }) => (data: CSVParams[]) => Promise<void>,
  onChunk: (params: {
    transaction: Transaction
    campaignId: number
  }) => (data: CSVParams[]) => Promise<void>
) => {
  return async (uploadData: UploadData<Template>): Promise<void> => {
    const { campaignId, template, s3Key, etag, filename } = uploadData

    try {
      // - download from s3
      const s3Client = new S3Client()
      await retry(async (bail) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const transaction = await Campaign.sequelize!.transaction()

        // Our processing function somehow hog event loop resulting in the worker
        // process not being able to send back heartbeat for the whole duration of
        // the file upload processing. Hence, we're solving it using an advisory lock
        // on our pg db. The reason we choose this lock over:
        //   - in-mem lock: this won't work across multiple instances of the backend
        //   - redis (or any external) lock: this won't be released for restarts upon
        //     server shutdowns/crashes, which is the whole point of using bee-queue
        //     with its external (redis) persistence
        const isAcquired = await pgAdvisoryLockCampaign(campaignId, transaction)
        if (!isAcquired) {
          await transaction.rollback()
          return
        }

        const downloadStream = await s3Client.download(s3Key, etag)
        const params = {
          transaction,
          template,
          campaignId: +campaignId,
        }

        try {
          await ParseCsvService.parseAndProcessCsv(
            downloadStream,
            onPreview(params),
            onChunk(params),
            onComplete({
              ...params,
              key: s3Key,
              filename,
            })
          )
        } catch (e) {
          await transaction.rollback()
          if ((e as any).code !== 'NoSuchKey') {
            bail(e as Error)
          } else {
            throw e
          }
        }
      }, RETRY_CONFIG)
    } catch (err) {
      // Precondition failure is caused by ETag mismatch. Convert to a more user-friendly error message.
      if ((err as any).code === 'PreconditionFailed') {
        ;(err as Error).message =
          'Please try again. Error processing the recipient list. Please contact the Postman team if this problem persists.'
      }

      throw err
    }
  }
}

/**
 * Stores error message in s3_object on failed upload
 * @param id - ID of failed upload job
 * @param uploadError
 */
const handleFailedUpload = async (
  id: string,
  uploadError: Error
): Promise<void> => {
  const queue = await getUploadQueue()

  try {
    const { data } = await getUpload(id)
    const { campaignId } = data
    await storeS3Error(+campaignId, uploadError.message)
    logger.error({
      message: `Processing for campaign ${data.campaignId} recipient list failed`,
      error: uploadError,
      ...data,
    })
  } catch (err) {
    logger.error({
      message: 'Error occurred while handling upload failure',
      error: err,
    })
  } finally {
    // Always remove the job after handling its error
    await queue.removeJob(id)
  }
}

/**
 * Handle stalled upload jobs
 * @param id - ID of stalled upload job
 */
const handleStalledUpload = async (id: string): Promise<void> => {
  const { data } = await getUpload(id)
  logger.info({
    message: `Upload for campaign ${data.campaignId} stalled and will be reprocessed`,
    ...data,
  })
}

/**
 * Remove all jobs and close upload queue
 */
const destroyUploadQueue = async (): Promise<void> => {
  if (uploadQueue) {
    // Clear all jobs
    await uploadQueue.destroy()
    await uploadQueue.close()
  }
}

export const UploadService = {
  /*** S3 API Calls ****/
  getUploadParameters,
  getPresignedUrl,
  extractParamsFromJwt,
  /**** Handle S3Key in DB *****/
  storeS3TempFilename,
  storeS3Error,
  deleteS3TempKeys,
  getCsvStatus,
  checkTemplateKeysMatch,
  /** Upload queue functions */
  getUploadQueue,
  enqueueUpload,
  getUpload,
  processUpload,
  handleFailedUpload,
  handleStalledUpload,
  destroyUploadQueue,
}
