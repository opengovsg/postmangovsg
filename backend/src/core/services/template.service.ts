import { v4 as uuid } from 'uuid'
import { difference, keys } from 'lodash'

import S3 from 'aws-sdk/clients/s3'
import { Transaction } from 'sequelize/types'

import config from '@core/config'
import logger from '@core/logger'
import { isSuperSet } from '@core/utils'
import { MissingTemplateKeysError } from '@core/errors/template.errors'
import { configureEndpoint } from '@core/utils/aws-endpoint'
import { jwtUtils } from '@core/utils/jwt'
import { Campaign } from '@core/models'
import { CsvStatusInterface } from '@core/interfaces'
import { CSVParams } from '@core/types'

const MAX_PROCESSING_TIME = config.get('csvProcessingTimeout')

const FILE_STORAGE_BUCKET_NAME = config.get('aws.uploadBucket')
const s3 = new S3({
  signatureVersion: 'v4',
  ...configureEndpoint(config),
})

/**
 * Returns a presigned url for uploading file to s3 bucket
 * @param contentType
 */
const getUploadParameters = async (
  contentType: string
): Promise<{ presignedUrl: string; signedKey: string }> => {
  const s3Key = uuid()

  const params = {
    Bucket: FILE_STORAGE_BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType,
    Expires: 180, // seconds
  }

  const signedKey = jwtUtils.sign(s3Key)

  const presignedUrl = await s3.getSignedUrlPromise('putObject', params)

  return { presignedUrl, signedKey }
}

/**
 * Decodes jwt
 * @param transactionId
 */
const extractS3Key = (transactionId: string): string => {
  let decoded: string
  try {
    decoded = jwtUtils.verify(transactionId) as string
  } catch (err) {
    logger.error(`${err.stack}`)
    throw new Error('Invalid transactionId provided')
  }
  return decoded as string
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
    logger.error(
      `Error storing error string in s3object for campaign ${campaignId}: ${e}`
    )
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
  let { error } = campaign.s3Object || {}

  let isCsvProcessing = !!tempFilename && !error

  // Check if still stuck in processing but past timeout threshold
  if (
    isCsvProcessing &&
    Date.now() - campaign.updatedAt > MAX_PROCESSING_TIME
  ) {
    isCsvProcessing = false
    error = 'Csv processing timeout. Please contact us if this persists.'
    await storeS3Error(campaignId, error)
  }
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
 * Checks the csv for all the necessary columns.
 * Transform the array of CSV rows into message interface
 * @param campaignId
 * @param fileContent
 */
const getRecordsFromCsv = (
  campaignId: number,
  fileContent: Array<CSVParams>,
  templateParams: Array<string>
): Array<MessageBulkInsertInterface> => {
  checkTemplateKeysMatch(fileContent, templateParams)

  return fileContent.map((entry) => {
    return {
      campaignId,
      recipient: entry['recipient'],
      params: entry,
    }
  })
}

export const TemplateService = {
  getUploadParameters,
  extractS3Key,
  replaceCampaignS3Metadata,
  storeS3TempFilename,
  storeS3Error,
  deleteS3TempKeys,
  getCsvStatus,
  getRecordsFromCsv,
}
