import S3 from 'aws-sdk/clients/s3'
import { difference, keys } from 'lodash'

import { Campaign } from '@core/models'
import { S3Service } from '@core/services'
import logger from '@core/logger'
import { isSuperSet } from '@core/utils'
import { jwtUtils } from '@core/utils/jwt'
import { SmsMessage, SmsTemplate } from '@sms/models'
import { MissingTemplateKeysError } from '@sms/errors/sms.errors'

const s3Client = new S3()

const upsertTemplate = async (body: string, campaignId: number): Promise<SmsTemplate> => {
  let transaction
  try {
    transaction = await SmsTemplate.sequelize?.transaction()
    // update
    if (await SmsTemplate.findByPk(campaignId, { transaction }) !== null) {
      // .update is actually a bulkUpdate
      const updatedTemplate: [number, SmsTemplate[]] = await SmsTemplate.update({
        body,
      }, {
        where: { campaignId },
        individualHooks: true, // required so that BeforeUpdate hook runs
        returning: true,
        transaction,
      })

      transaction?.commit()
      return updatedTemplate[1][0]
    }
    // else create
    const createdTemplate = await SmsTemplate.create({
      campaignId, body,
      transaction,
    })

    transaction?.commit()
    return createdTemplate
  } catch (err) {
    transaction?.rollback()
    throw err
  }
}

// decodes JWT
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
 * 1. delete existing entries
 * 2. bulk insert
 * 3. mark campaign as valid
 * steps 1- 3 are wrapped in txn. rollback if any fails
 * @param campaignId
 * @param records
 */
const populateTemplate = async (campaignId: number, records: Array<object>) => {
  let transaction
  try {
    transaction = await SmsMessage.sequelize?.transaction()
    // delete message_logs entries
    await SmsMessage.destroy({
      where: { campaignId },
      transaction,
    })
    await SmsMessage.bulkCreate(records, { transaction })
    await Campaign.update({
      valid: true,
    }, {
      where: {
        id: campaignId,
      },
      transaction,
    })
    await transaction?.commit()
  } catch (err) {
    await transaction?.rollback()
    logger.error(`SmsMessage: destroy / bulkcreate failure. ${err.stack}`)
    throw new Error(`SmsMessage: destroy / bulkcreate failure`)
  }
}

const testHydration = async (campaignId: number, s3Key: string, smsTemplate: SmsTemplate): Promise<Array<object>> => {
  try {
    const s3Service = new S3Service(s3Client)
    const downloadStream = s3Service.download(s3Key)
    const fileContents = await s3Service.parseCsv(downloadStream)
    // FIXME / TODO: dedupe
    const records: Array<object> = fileContents.map(entry => {
      return {
        campaignId,
        recipient: entry['recipient'],
        params: entry,
      }
    })

    // attempt to hydrate
    const firstRecord = fileContents[0]
    // if body exists, smsTemplate.params should also exist
    if (!isSuperSet(keys(firstRecord), smsTemplate.params!)) {
      // TODO: lodash diff to show missing keys
      const missingKeys = difference(smsTemplate.params!, keys(firstRecord))
      throw new MissingTemplateKeysError(missingKeys)
    }
    return records
  } catch (err) {
    throw err
  }
}

export { extractS3Key, populateTemplate, testHydration, upsertTemplate }