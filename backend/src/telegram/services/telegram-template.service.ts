import { difference, keys } from 'lodash'

import config from '@core/config'
import { ChannelType } from '@shared/core/constants'
import { isSuperSet } from '@core/utils'
import { UploadService } from '@core/services'
import { UploadData } from '@shared/core/interfaces'
import { InvalidRecipientError, HydrationError } from '@core/errors'
import { Campaign, Statistic } from '@shared/core/models'
import { PhoneNumberService } from '@core/services'
import {
  TemplateClient,
  XSS_TELEGRAM_OPTION,
  TemplateError,
} from '@shared/templating'

import { TelegramMessage, TelegramTemplate } from '@shared/core/models/telegram'
import { TelegramService } from '@telegram/services'
import { StoreTemplateInput, StoreTemplateOutput } from '@telegram/interfaces'
import { MessageBulkInsertInterface } from '@shared/core/interfaces/message.interface'
const client = new TemplateClient({
  xssOptions: XSS_TELEGRAM_OPTION,
  lineBreak: '\n',
})

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
      const updatedTemplate: [number, TelegramTemplate[]] =
        await TelegramTemplate.update(
          { body },
          {
            where: { campaignId },
            individualHooks: true, // required so that BeforeUpdate hook runs
            returning: true,
            transaction,
          }
        )

      await transaction?.commit()
      return updatedTemplate[1][0]
    }

    const createdTemplate = await TelegramTemplate.create(
      { campaignId, body } as TelegramTemplate,
      { transaction }
    )

    await transaction?.commit()
    return createdTemplate
  } catch (err) {
    await transaction?.rollback()
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
    // warn if params from s3 file are not a superset of saved params, remind user to re-upload a new file
    const extraKeysInTemplate = difference(updatedTemplate.params, paramsFromS3)

    // delete entries (message_logs) from the uploaded file and stored count since they are no longer valid,
    await TelegramMessage.sequelize?.transaction(async (transaction) => {
      await TelegramMessage.destroy({
        where: {
          campaignId,
        },
        transaction,
      })
      await Statistic.destroy({
        where: {
          campaignId,
        },
        transaction,
      })
    })

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
  const sanitizedBody = client.replaceNewLinesAndSanitize(body)
  if (!sanitizedBody) {
    throw new TemplateError(
      'Message template is invalid as it only contains invalid HTML tags!'
    )
  }
  const updatedTemplate = await upsertTelegramTemplate({
    campaignId,
    body: sanitizedBody,
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
      return { updatedTemplate, check }
    }
  }

  const campaign = await Campaign.findByPk(+campaignId)
  return { updatedTemplate, valid: campaign?.valid }
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
 * Validate that recipient is a valid phone number and format it.
 */
const validateAndFormatNumber = (
  records: MessageBulkInsertInterface[]
): MessageBulkInsertInterface[] => {
  return records.map((record) => {
    try {
      const { recipient } = record
      const normalised = PhoneNumberService.normalisePhoneNumber(
        recipient,
        config.get('defaultCountry')
      )
      return {
        ...record,
        recipient: normalised,
      }
    } catch (e) {
      throw new InvalidRecipientError()
    }
  })
}

/**
 * Attempts to hydrate the first record.
 * @param records
 * @param templateBody
 */
const testHydration = (
  records: Array<{ params: { [key: string]: string } }>,
  templateBody: string
): void => {
  const [firstRecord] = records
  client.template(templateBody, firstRecord.params)
}

/**
 * Enqueue a new Telegram recipient list upload
 * @param uploadData
 */
const enqueueUpload = (data: UploadData<TelegramTemplate>): Promise<string> => {
  return UploadService.enqueueUpload({
    channelType: ChannelType.Telegram,
    data,
  })
}

/**
 * Process a Telegram campaign recipient list upload
 * @param uploadData
 */
const processUpload = (
  uploadData: UploadData<TelegramTemplate>
): Promise<void> =>
  UploadService.processUpload<TelegramTemplate>(
    TelegramService.uploadCompleteOnPreview,
    TelegramService.uploadCompleteOnChunk
  )(uploadData)

export const TelegramTemplateService = {
  storeTemplate,
  getFilledTemplate,
  validateAndFormatNumber,
  testHydration,
  client,
  enqueueUpload,
  processUpload,
}
