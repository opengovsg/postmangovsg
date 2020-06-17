import { chunk, difference, keys } from 'lodash'
import { Transaction } from 'sequelize'

import { InvalidRecipientError } from '@core/errors'
import config from '@core/config'
import logger from '@core/logger'
import { isSuperSet } from '@core/utils'
import { HydrationError } from '@core/errors'
import { Campaign } from '@core/models'
import TemplateClient from '@core/services/template-client.class'

import { TelegramMessage, TelegramTemplate } from '@telegram/models'
import { StoreTemplateInput, StoreTemplateOutput } from '@sms/interfaces'

const client = new TemplateClient(config.get('xssOptions.telegram'), '\n')

/**
 * Create or replace a template. The mustached attributes are extracted in a sequelize hook,
 * and saved to the 'params' column in telegram_template
 */
const upsertTelegramTemplate = async ({
  body,
  campaignId,
}: {
  body: string
  campaignId: number
}): Promise<TelegramTemplate> => {
  let transaction
  try {
    transaction = await TelegramTemplate.sequelize?.transaction()
    if (
      (await TelegramTemplate.findByPk(campaignId, { transaction })) !== null
    ) {
      const updatedTemplate: [
        number,
        TelegramTemplate[]
      ] = await TelegramTemplate.update(
        { body },
        {
          where: { campaignId },
          individualHooks: true, // required so that BeforeUpdate hook runs
          returning: true,
          transaction,
        }
      )

      transaction?.commit()
      return updatedTemplate[1][0]
    }

    const createdTemplate = await TelegramTemplate.create(
      { campaignId, body },
      { transaction }
    )

    transaction?.commit()
    return createdTemplate
  } catch (err) {
    transaction?.rollback()
    throw err
  }
}

/**
 * If a new template is uploaded over an existing valid template and csv,
 * we have to check that this new template still matches the columns of the existing csv.
 * side effects:
 *  - updates campaign 'valid' column
 *  - may delete email_message where campaignId
 */
const checkNewTemplateParams = async ({
  campaignId,
  updatedTemplate,
  firstRecord,
}: {
  campaignId: number
  updatedTemplate: TelegramTemplate
  firstRecord: TelegramMessage
}): Promise<{ reupload: boolean; extraKeys?: Array<string> }> => {
  if (!updatedTemplate.params) return { reupload: false }

  await Campaign.update({ valid: false }, { where: { id: campaignId } })

  const paramsFromS3 = keys(firstRecord.params)

  const templateContainsExtraKeys = !isSuperSet(
    paramsFromS3,
    updatedTemplate.params
  )
  if (templateContainsExtraKeys) {
    const extraKeysInTemplate = difference(updatedTemplate.params, paramsFromS3)

    await TelegramMessage.destroy({ where: { campaignId } })

    return { reupload: true, extraKeys: extraKeysInTemplate }
  } else {
    try {
      // Attempt to hydrate message to check if the params are valid.
      client.template(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        updatedTemplate.body!,
        firstRecord.params as { [key: string]: string }
      )
    } catch (err) {
      logger.error(`Hydration error: ${err.stack}`)
      throw new HydrationError()
    }

    // Set campaign.valid to true since templating suceeded AND file has been uploaded
    await Campaign.update(
      { valid: true },
      {
        where: { id: campaignId },
      }
    )

    return { reupload: false }
  }
}

/**
 * Given a template, sanitize and save it in the database. If a csv file already existed before
 * for this campaign, check that this new tempalte still matches the columns of the existing csvs.
 */
const storeTemplate = async ({
  campaignId,
  body,
}: StoreTemplateInput): Promise<StoreTemplateOutput> => {
  const updatedTemplate = await upsertTelegramTemplate({
    campaignId,
    body: client.replaceNewLinesAndSanitize(body),
  })

  const firstRecord = await TelegramMessage.findOne({
    where: { campaignId },
  })

  // If recipients list has been uploaded before, have to check if updatedTemplate still matches list
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

  const numRecipients = await TelegramMessage.count({ where: { campaignId } })
  const campaign = await Campaign.findByPk(+campaignId)

  return { updatedTemplate, numRecipients, valid: campaign?.valid }
}

/**
 *  Finds a template that has all its columns set
 * @param campaignId
 */
const getFilledTemplate = async (
  campaignId: number
): Promise<TelegramTemplate | null> => {
  const telegramTemplate = await TelegramTemplate.findOne({
    where: { campaignId },
  })
  if (!telegramTemplate?.body || !telegramTemplate.params) {
    return null
  }
  return telegramTemplate
}

/**
 * 1. delete existing entries
 * 2. bulk insert
 * @param campaignId
 * @param records
 * @param transaction
 */
const addToMessageLogs = async (
  campaignId: number,
  records: Array<object>,
  transaction: Transaction | undefined
): Promise<void> => {
  try {
    logger.info({
      message: `Started populateTelegramTemplate for ${campaignId}`,
    })
    // delete message_logs entries
    await TelegramMessage.destroy({
      where: { campaignId },
      transaction,
    })

    const chunks = chunk(records, 5000)
    for (let idx = 0; idx < chunks.length; idx++) {
      const batch = chunks[idx]
      await TelegramMessage.bulkCreate(batch, { transaction })
    }
    logger.info({
      message: `Finished populateTelegramTemplate for ${campaignId}`,
    })
  } catch (err) {
    logger.error(`SmsMessage: destroy / bulkcreate failure. ${err.stack}`)
    throw new Error('SmsMessage: destroy / bulkcreate failure')
  }
}

const validateAndFormatNumber = (
  records: MessageBulkInsertInterface[]
): MessageBulkInsertInterface[] => {
  const re = /^\+?[0-9]+$/

  return records.map((record) => {
    const { recipient } = record
    if (!re.test(recipient)) {
      throw new InvalidRecipientError()
    }

    // Append default country code if does not exists.
    if (!recipient.startsWith('+') && config.get('defaultCountryCode')) {
      record.recipient = `+${config.get('defaultCountryCode')}${recipient}`
    }
    return record
  })
}

export const TelegramTemplateService = {
  storeTemplate,
  getFilledTemplate,
  addToMessageLogs,
  validateAndFormatNumber,
  client,
}
