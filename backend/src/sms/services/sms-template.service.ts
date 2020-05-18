import { difference, keys, chunk } from 'lodash'
import { SmsTemplate, SmsMessage } from '@sms/models'
import { Campaign } from '@core/models'
import { isSuperSet } from '@core/utils'
import TemplateClient from '@core/services/template-client.class'
import logger from '@core/logger'
import { HydrationError } from '@core/errors'
import config from '@core/config'
import { StoreTemplateInput, StoreTemplateOutput } from '@sms/interfaces'

const validateSmsRecipient = (recipient: string): boolean => (/^\+?[0-9]+$/.test(recipient))
const client = new TemplateClient(config.xssOptions.sms, validateSmsRecipient)

const upsertSmsTemplate = async ({ body, campaignId }: {body: string; campaignId: number}): Promise<SmsTemplate> => {
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
    }, {
      transaction,
    })
  
      transaction?.commit()
      return createdTemplate
  } catch (err) {
      transaction?.rollback()
      throw err
  }
}
  
/**
 * side effects:
 *  - updates campaign 'valid' column
 *  - may delete sms_message where campaignId
 */
const checkNewTemplateParams = async ({
  campaignId,
  updatedTemplate,
  firstRecord,
}: {
    campaignId: number;
    updatedTemplate: SmsTemplate;
    firstRecord: SmsMessage;
  }): Promise<{
    reupload: boolean;
    extraKeys?: Array<string>;
  }> => {
  // new template might not even have params, (not inserted yet - hydration doesn't even need to take place
  if (!updatedTemplate.params) return { reupload: false }
  
  // first set project.valid to false, switch this back to true only when hydration succeeds
  await Campaign.update({ valid: false }, { where: { id: campaignId } })
  
  const paramsFromS3 = keys(firstRecord.params)
  
  const templateContainsExtraKeys = !isSuperSet(paramsFromS3, updatedTemplate.params)
  if (templateContainsExtraKeys) {
    // warn if params from s3 file are not a superset of saved params, remind user to re-upload a new file
    const extraKeysInTemplate = difference(
      updatedTemplate.params,
      paramsFromS3
    )
  
    // the entries (message_logs) from the uploaded file are no longer valid, so we delete
    await SmsMessage.destroy({
      where: {
        campaignId,
      },
    })
  
    return { reupload: true, extraKeys: extraKeysInTemplate }
  } else {
    // the keys in the template are either a subset or the same as what is present in the uploaded file
  
    try {
      client.template(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          updatedTemplate.body!,
          firstRecord.params as { [key: string]: string }
      )
    } catch (err) {
      logger.error(`Hydration error: ${err.stack}`)
      throw new HydrationError()
    }
    // set campaign.valid to true since templating suceeded AND file has been uploaded
    await Campaign.update({ valid: true }, {
      where: { id: campaignId },
    })
  
    return { reupload: false }
  }
}
  

const storeTemplate = async ({ campaignId, body }: StoreTemplateInput): Promise<StoreTemplateOutput> => {
  const updatedTemplate = await upsertSmsTemplate({ 
    body: client.replaceNewLinesAndSanitize(body), 
    campaignId: +campaignId,
  })

  const firstRecord = await SmsMessage.findOne({
    where: { campaignId },
  })

  // if recipients list has been uploaded before, have to check if updatedTemplate still matches list
  if (firstRecord && updatedTemplate.params) {
    const check = await checkNewTemplateParams({
      campaignId: +campaignId,
      updatedTemplate,
      firstRecord,
    })
    if (check.reupload) {
      return { updatedTemplate, numRecipients: 0, check }
    }
  }


  const numRecipients = await SmsMessage.count({ where: { campaignId } })
  const campaign = await Campaign.findByPk(+campaignId)
  return { updatedTemplate, numRecipients, valid: campaign?.valid }
}

const getFilledTemplate = async (campaignId: number): Promise<SmsTemplate | null> => {
  const smsTemplate = await SmsTemplate.findOne({ where: { campaignId } })
  if (!smsTemplate?.body || !smsTemplate.params) {
    return null
  }
  return smsTemplate
}

/**
 * 1. delete existing entries
 * 2. bulk insert
 * 3. mark campaign as valid
 * steps 1- 3 are wrapped in txn. rollback if any fails
 * @param campaignId
 * @param records
 */
const addToMessageLogs = async (campaignId: number, records: Array<object>): Promise<void> => {
  let transaction
  try {
    logger.info({ message: `Started populateSmsTemplate for ${campaignId}` })
    transaction = await SmsMessage.sequelize?.transaction()
    // delete message_logs entries
    await SmsMessage.destroy({
      where: { campaignId },
      transaction,
    })
  
    const chunks = chunk(records, 5000)
    for (let idx = 0; idx < chunks.length; idx++) {
      const batch = chunks[idx]
      await SmsMessage.bulkCreate(batch, { transaction })
    }
  
    await Campaign.update({
      valid: true,
    }, {
      where: {
        id: campaignId,
      },
      transaction,
    })
    await transaction?.commit()
    logger.info({ message: `Finished populateSmsTemplate for ${campaignId}` })
  } catch (err) {
    await transaction?.rollback()
    logger.error(`SmsMessage: destroy / bulkcreate failure. ${err.stack}`)
    throw new Error('SmsMessage: destroy / bulkcreate failure')
  }
}

export const SmsTemplateService = {
  storeTemplate,
  getFilledTemplate,
  addToMessageLogs,
  client,
}