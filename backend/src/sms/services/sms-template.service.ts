import { difference, keys } from 'lodash'

import { ChannelType } from '@core/constants'
import { isSuperSet } from '@core/utils'
import { HydrationError } from '@core/errors'
import { UploadService } from '@core/services'
import { UploadData } from '@core/interfaces'
import { Campaign, Statistic } from '@core/models'
import {
  TemplateClient,
  XSS_SMS_OPTION,
  TemplateError,
} from '@shared/templating'

import { SmsTemplate, SmsMessage } from '@sms/models'
import { SmsService } from '@sms/services'
import { StoreTemplateInput, StoreTemplateOutput } from '@sms/interfaces'

const client = new TemplateClient({ xssOptions: XSS_SMS_OPTION })

/**
 * Create or replace a template. The mustached attributes are extracted in a sequelize hook,
 * and saved to the 'params' column in sms_template
 */
const upsertSmsTemplate = async ({
  body,
  campaignId,
}: {
  body: string
  campaignId: number
}): Promise<SmsTemplate> => {
  let transaction
  try {
    transaction = await SmsTemplate.sequelize?.transaction()
    // update
    if (
      (await SmsTemplate.findByPk(campaignId, {
        transaction,
      })) !== null
    ) {
      // .update is actually a bulkUpdate
      const updatedTemplate: [number, SmsTemplate[]] = await SmsTemplate.update(
        {
          body,
        },
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
    // else create
    const createdTemplate = await SmsTemplate.create(
      {
        campaignId,
        body,
      } as SmsTemplate,
      {
        transaction,
      }
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
 *  - may delete sms_message where campaignId
 */
const checkNewTemplateParams = async ({
  campaignId,
  updatedTemplate,
  firstRecord,
}: {
  campaignId: number
  updatedTemplate: SmsTemplate
  firstRecord: SmsMessage
}): Promise<{
  reupload: boolean
  extraKeys?: Array<string>
}> => {
  // new template might not even have params, (not inserted yet - hydration doesn't even need to take place
  if (!updatedTemplate.params) return { reupload: false }

  // first set project.valid to false, switch this back to true only when hydration succeeds
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
    await SmsMessage.sequelize?.transaction(async (transaction) => {
      await SmsMessage.destroy({
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
    // the keys in the template are either a subset or the same as what is present in the uploaded file

    try {
      client.template(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        updatedTemplate.body!,
        firstRecord.params as { [key: string]: string }
      )
    } catch (err) {
      throw new HydrationError()
    }
    // set campaign.valid to true since templating suceeded AND file has been uploaded
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
 * Given a template, sanitize it and save it to the db
 * If a csv file already existed before for this campaign, check that this new template still matches the columns of the existing csv.
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
  const updatedTemplate = await upsertSmsTemplate({
    body: sanitizedBody,
    campaignId,
  })

  const firstRecord = await SmsMessage.findOne({
    where: { campaignId },
  })

  // if recipients list has been uploaded before, have to check if updatedTemplate still matches list
  if (firstRecord && updatedTemplate.params) {
    const check = await checkNewTemplateParams({
      campaignId,
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
): Promise<SmsTemplate | null> => {
  const smsTemplate = await SmsTemplate.findOne({
    where: { campaignId },
  })
  if (!smsTemplate?.body || !smsTemplate.params) {
    return null
  }
  return smsTemplate
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
 * Enqueue a new SMS recipient list upload
 * @param uploadData
 */
const enqueueUpload = (data: UploadData<SmsTemplate>): Promise<string> => {
  return UploadService.enqueueUpload({
    channelType: ChannelType.SMS,
    data,
  })
}

/**
 * Process a SMS campaign recipient list upload
 * @param uploadData
 */
const processUpload = (uploadData: UploadData<SmsTemplate>): Promise<void> =>
  UploadService.processUpload<SmsTemplate>(
    SmsService.uploadCompleteOnPreview,
    SmsService.uploadCompleteOnChunk
  )(uploadData)

export const SmsTemplateService = {
  storeTemplate,
  getFilledTemplate,
  testHydration,
  client,
  enqueueUpload,
  processUpload,
}
