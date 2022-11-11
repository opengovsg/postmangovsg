import { difference, keys } from 'lodash'

import config from '@core/config'
import { isSuperSet } from '@core/utils'
import { HydrationError } from '@core/errors'
import { CustomDomainService } from '@email/services'
import { Campaign, Statistic } from '@shared/core/models'
import {
  TemplateClient,
  XSS_EMAIL_OPTION,
  TemplateError,
} from '@shared/templating'

import { EmailTemplate, EmailMessage } from '@shared/core/models/email'
import { EmailService } from '@email/services'
import { StoreTemplateInput, StoreTemplateOutput } from '@email/interfaces'
import { parseFromAddress, formatFromAddress } from '@shared/utils/from-address'
import { UploadService } from '@core/services'
import { UploadData } from '@shared/core/interfaces'
import { ChannelType } from '@shared/core/constants'

const client = new TemplateClient({ xssOptions: XSS_EMAIL_OPTION })

/**
 * Create or replace a template. The mustached attributes are extracted in a sequelize hook,
 * and saved to the 'params' column in email_template
 */
const upsertEmailTemplate = async ({
  subject,
  body,
  replyTo,
  campaignId,
  from,
  showLogo,
}: StoreTemplateInput): Promise<EmailTemplate> => {
  let transaction
  try {
    transaction = await EmailTemplate.sequelize?.transaction()
    // update
    if (
      (await EmailTemplate.findByPk(campaignId, {
        transaction,
      })) !== null
    ) {
      // .update is actually a bulkUpdate
      const updatedTemplate: [number, EmailTemplate[]] =
        await EmailTemplate.update(
          {
            subject,
            body,
            replyTo,
            from,
            showLogo,
          } as EmailTemplate,
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
    // else create
    const createdTemplate = await EmailTemplate.create(
      {
        campaignId,
        body,
        subject,
        replyTo,
        from,
        showLogo,
      } as EmailTemplate,
      {
        transaction,
      }
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
  from,
  showLogo,
}: StoreTemplateInput): Promise<StoreTemplateOutput> => {
  // extract params from template, save to db (this will be done with hook)
  const sanitizedSubject = client.replaceNewLinesAndSanitize(subject)
  const sanitizedBody = client.filterXSS(body)
  if (!sanitizedSubject || !sanitizedBody) {
    throw new TemplateError(
      'Message template is invalid as it only contains invalid HTML tags!'
    )
  }

  // Append via to sender name if it is not the default from name
  const { fromName: defaultFromName, fromAddress: defaultFromAddress } =
    parseFromAddress(config.get('mailFrom'))
  const { fromName, fromAddress } = parseFromAddress(from)

  let expectedFromName: string | null
  if (fromAddress === defaultFromAddress) {
    expectedFromName = defaultFromName
  } else {
    const customFromAddress = await CustomDomainService.getCustomFromAddress(
      fromAddress
    )
    if (!customFromAddress) throw new Error('Invalid custom from address')
    const { fromName: customFromName } = parseFromAddress(customFromAddress)
    expectedFromName = customFromName
  }

  const mailVia = config.get('mailVia')
  const formattedFrom = formatFromAddress(
    fromName && expectedFromName !== fromName && !fromName.endsWith(mailVia)
      ? `${fromName} ${mailVia}`
      : fromName,
    fromAddress
  )

  const updatedTemplate = await upsertEmailTemplate({
    subject: sanitizedSubject,
    body: sanitizedBody,
    replyTo,
    campaignId,
    from: formattedFrom,
    showLogo,
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
  const emailTemplate = await EmailTemplate.findOne({
    where: { campaignId },
  })
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
 * Attempts to hydrate the first record.
 * @param records
 * @param templateBody
 * @param templateSubject - optional
 */
const testHydration = (
  records: Array<{ params: { [key: string]: string } }>,
  templateBody: string,
  templateSubject: string
): void => {
  const [firstRecord] = records
  client.template(templateBody, firstRecord.params)
  client.template(templateSubject, firstRecord.params)
}

/**
 * Enqueue a new email recipient list upload
 * @param uploadData
 */
const enqueueUpload = (
  uploadData: UploadData<EmailTemplate>,
  protect?: boolean
): Promise<string> => {
  return UploadService.enqueueUpload({
    channelType: ChannelType.Email,
    protect,
    data: uploadData,
  })
}

/**
 * Process an email campaign recipient list upload
 * @param uploadData
 */
const processUpload = (uploadData: UploadData<EmailTemplate>): Promise<void> =>
  UploadService.processUpload<EmailTemplate>(
    EmailService.uploadCompleteOnPreview,
    EmailService.uploadCompleteOnChunk
  )(uploadData)

/**
 * Process a protected email campaign recipient list upload
 * @param uploadData
 */
const processProtectedUpload = (
  uploadData: UploadData<EmailTemplate>
): Promise<void> =>
  UploadService.processUpload<EmailTemplate>(
    EmailService.uploadProtectedCompleteOnPreview,
    EmailService.uploadProtectedCompleteOnChunk
  )(uploadData)

export const EmailTemplateService = {
  storeTemplate,
  getFilledTemplate,
  testHydration,
  enqueueUpload,
  processUpload,
  processProtectedUpload,
  client,
}
