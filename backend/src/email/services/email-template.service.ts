import { difference, keys, chunk } from 'lodash'
import validator from 'validator'
import { Transaction } from 'sequelize'

import config from '@core/config'
import logger from '@core/logger'
import { isSuperSet } from '@core/utils'
import { HydrationError } from '@core/errors'
import { Campaign, Statistic } from '@core/models'
import { TemplateClient } from 'postman-templating'

import { EmailTemplate, EmailMessage } from '@email/models'
import { StoreTemplateInput, StoreTemplateOutput } from '@email/interfaces'

const client = new TemplateClient(config.get('xssOptions.email'))

/**
 * Create or replace a template. The mustached attributes are extracted in a sequelize hook,
 * and saved to the 'params' column in email_template
 */
const upsertEmailTemplate = async ({
  subject,
  body,
  replyTo,
  campaignId,
}: {
  subject: string
  body: string
  replyTo: string | null
  campaignId: number
}): Promise<EmailTemplate> => {
  let transaction
  try {
    transaction = await EmailTemplate.sequelize?.transaction()
    // update
    if ((await EmailTemplate.findByPk(campaignId, { transaction })) !== null) {
      // .update is actually a bulkUpdate
      const updatedTemplate: [
        number,
        EmailTemplate[]
      ] = await EmailTemplate.update(
        {
          subject,
          body,
          replyTo,
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
    const createdTemplate = await EmailTemplate.create(
      {
        campaignId,
        body,
        subject,
        replyTo,
      },
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
 *  - may delete email_message where campaignId
 */
const checkNewTemplateParams = async ({
  campaignId,
  updatedTemplate,
  firstRecord,
}: {
  campaignId: number
  updatedTemplate: EmailTemplate
  firstRecord: EmailMessage
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
    await EmailMessage.sequelize?.transaction(async (transaction) => {
      await EmailMessage.destroy({
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
      logger.error(`Hydration error: ${err.stack}`)
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
  subject,
  body,
  replyTo,
}: StoreTemplateInput): Promise<StoreTemplateOutput> => {
  // extract params from template, save to db (this will be done with hook)
  const updatedTemplate = await upsertEmailTemplate({
    subject: client.replaceNewLinesAndSanitize(subject),
    body: client.replaceNewLinesAndSanitize(body),
    replyTo,
    campaignId,
  })

  // TODO: this is slow when table is large
  const firstRecord = await EmailMessage.findOne({
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

  const campaign = await Campaign.findByPk(campaignId)
  return { updatedTemplate, valid: campaign?.valid }
}

/**
 *  Finds a template that has all its columns set
 * @param campaignId
 */
const getFilledTemplate = async (
  campaignId: number
): Promise<EmailTemplate | null> => {
  const emailTemplate = await EmailTemplate.findOne({ where: { campaignId } })
  if (
    !emailTemplate?.body ||
    !emailTemplate?.subject ||
    !emailTemplate.params
  ) {
    return null
  }
  return emailTemplate
}

/**
 * 1. delete existing entries
 * 2. bulk insert
 *
 * @param campaignId
 * @param records
 * @param transaction
 */
const addToMessageLogs = async (
  campaignId: number,
  records: Array<object>,
  transaction: Transaction | undefined
): Promise<void> => {
  logger.info({ message: `Started populateEmailTemplate for ${campaignId}` })
  try {
    // delete message_logs entries
    await EmailMessage.destroy({
      where: { campaignId },
      transaction,
    })

    const chunks = chunk(records, 5000)
    for (let idx = 0; idx < chunks.length; idx++) {
      const batch = chunks[idx]
      await EmailMessage.bulkCreate(batch, { transaction })
    }

    logger.info({ message: `Finished populateEmailTemplate for ${campaignId}` })
  } catch (err) {
    logger.error(`EmailMessage: destroy / bulkcreate failure. ${err.stack}`)
    throw new Error('EmailMessage: destroy / bulkcreate failure')
  }
}

const hasInvalidEmailRecipient = (
  records: MessageBulkInsertInterface[]
): boolean => {
  return records.some((record) => !validator.isEmail(record.recipient))
}

/**
 * Attempts to hydrate the first record.
 * @param records
 * @param templateBody
 * @param templateSubject - optional
 */
const testHydration = (
  records: Array<MessageBulkInsertInterface>,
  templateBody: string,
  templateSubject?: string
): void => {
  const [firstRecord] = records
  client.template(templateBody, firstRecord.params)

  if (templateSubject) {
    client.template(templateSubject, firstRecord.params)
  }
}

export const EmailTemplateService = {
  storeTemplate,
  getFilledTemplate,
  addToMessageLogs,
  hasInvalidEmailRecipient,
  testHydration,
  client,
}
