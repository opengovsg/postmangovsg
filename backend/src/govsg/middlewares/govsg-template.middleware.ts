import { ChannelType } from '@core/constants'
import {
  InvalidRecipientError,
  MissingTemplateKeysError,
  RecipientColumnMissing,
  UserError,
} from '@core/errors'
import {
  ApiAuthenticationError,
  ApiInvalidTemplateError,
  ApiNotFoundError,
} from '@core/errors/rest-api.errors'
import { loggerWithLabel } from '@core/logger'
import { Campaign, Statistic } from '@core/models'
import { CampaignService, StatsService, UploadService } from '@core/services'
import { GovsgTemplatesAccess } from '@govsg/models'
import { CampaignGovsgTemplate } from '@govsg/models/campaign-govsg-template'
import { GovsgMessage } from '@govsg/models/govsg-message'
import {
  GovsgTemplate,
  GovsgTemplateLanguageMetadata,
} from '@govsg/models/govsg-template'
import { GovsgTemplateService } from '@govsg/services'
import { NextFunction, Request, Response } from 'express'

const logger = loggerWithLabel(module)

const convertMultilingualSupportToResponse = (
  multilingualSupport: Array<GovsgTemplateLanguageMetadata>
) => {
  return multilingualSupport.map((languageSupport) => ({
    body: languageSupport.body,
    language: languageSupport.language,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    code: languageSupport.languageCode ?? languageSupport['language_code'],
  }))
}

function convertGovsgTemplateToResponse(template: GovsgTemplate) {
  return {
    id: template.id,
    body: template.body,
    params: template.params,
    param_metadata: template.paramMetadata,
    name: template.name,
    languages: convertMultilingualSupportToResponse(
      template.multilingualSupport
    ),
  }
}

export const getAvailableTemplates = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = req.session?.user.id
  const allowedTemplates = (
    await GovsgTemplatesAccess.findAll({
      where: { userId },
      include: {
        model: GovsgTemplate,
      },
    })
  ).map((o) => convertGovsgTemplateToResponse(o.govsgTemplate))
  return res.status(200).json({ data: allowedTemplates })
}

async function checkUserTemplateAccess(
  userId: number,
  templateId: number
): Promise<void> {
  const allowed = await GovsgTemplatesAccess.findOne({
    where: { userId, templateId },
  })
  if (!allowed) {
    throw new ApiInvalidTemplateError(
      `User ${userId} does not have access to template ${templateId}`
    )
  }
}

export async function pickTemplateForCampaign(
  req: Request,
  res: Response
): Promise<Response> {
  if (!req.session?.user?.id) {
    throw new ApiAuthenticationError('Request not authenticated')
  }
  const userId = req.session.user.id
  const { template_id: templateId, for_single_recipient: forSingleRecipient } =
    req.body
  await checkUserTemplateAccess(userId, templateId)
  const campaignId = +req.params.campaignId
  const [template, campaign] = await Promise.all([
    GovsgTemplate.findOne({
      where: {
        id: templateId,
      },
    }),
    CampaignService.getCampaignDetails(campaignId, []),
  ])
  if (!template) {
    throw new ApiNotFoundError(`Template with ID ${templateId} not found`)
  }
  if (!campaign) {
    throw new ApiNotFoundError(`Campaign with ID ${campaignId} not found`)
  }

  const pivot = await CampaignGovsgTemplate.findOne({
    where: { campaignId, govsgTemplateId: templateId, forSingleRecipient },
  })

  if (!pivot) {
    await CampaignGovsgTemplate.sequelize?.transaction(async (t) => {
      await GovsgMessage.destroy({
        where: { campaignId },
        transaction: t,
      })
      await Statistic.destroy({
        where: { campaignId },
        transaction: t,
      })
      await CampaignGovsgTemplate.destroy({
        where: { campaignId },
        transaction: t,
      })
      await CampaignGovsgTemplate.create(
        {
          campaignId,
          govsgTemplateId: templateId,
          forSingleRecipient,
        } as CampaignGovsgTemplate,
        { transaction: t }
      )
      await Campaign.update(
        { valid: false },
        { where: { id: campaignId }, transaction: t }
      )
    })
  }

  return res.status(200).json({
    message: pivot
      ? `Template ${templateId} picked for campaign`
      : `Please re-upload your recipient list as template choice has changed`,
    num_recipients: pivot ? campaign.num_recipients : 0,
    valid: !!pivot,
    template: {
      id: template.id,
      name: template.name,
      body: template.body,
      params: template.params,
      param_metadata: template.paramMetadata,
      languages: convertMultilingualSupportToResponse(
        template.multilingualSupport
      ),
    },
    for_single_recipient: forSingleRecipient,
  })
}

export async function uploadCompleteHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  const campaignId = +req.params.campaignId
  const { transaction_id: transactionId, filename, etag } = req.body
  const logMeta = { campaignId, action: 'uploadCompleteHandler' }

  try {
    const { s3Key } = UploadService.extractParamsFromJwt(transactionId)

    const template = await GovsgTemplateService.getFilledTemplate(campaignId)
    if (!template) {
      throw new ApiInvalidTemplateError(
        'No template assigned to the campaign yet.'
      )
    }

    await UploadService.storeS3TempFilename(campaignId, filename)
    logger.info({ message: 'Stored temporary S3 filename', ...logMeta })

    await UploadService.enqueueUpload({
      channelType: ChannelType.Govsg,
      data: {
        campaignId,
        template,
        etag,
        s3Key,
        filename,
      },
    })

    return res.status(202).json({ id: campaignId })
  } catch (err) {
    logger.error({
      message: 'Failed to complete upload to s3',
      error: err,
      ...logMeta,
    })
    const userErrors = [
      UserError,
      RecipientColumnMissing,
      MissingTemplateKeysError,
      InvalidRecipientError,
    ]

    if (userErrors.some((errType) => err instanceof errType)) {
      throw new ApiInvalidTemplateError((err as Error).message)
    }
    return next(err)
  }
}

export async function pollCsvStatusHandler(
  req: Request,
  res: Response
): Promise<Response> {
  const campaignId = +req.params.campaignId
  const { isCsvProcessing, filename, tempFilename, error } =
    await UploadService.getCsvStatus(campaignId)

  const statusObj = {
    is_csv_processing: isCsvProcessing,
    csv_filename: filename,
    temp_csv_filename: tempFilename,
    csv_error: error,
    num_recipients: undefined as any,
    preview: undefined as any,
  }
  if (!isCsvProcessing) {
    ;[statusObj.num_recipients, statusObj.preview] = await Promise.all([
      StatsService.getNumRecipients(campaignId),
      GovsgTemplateService.getHydratedMessage(campaignId),
    ])
  }

  return res.status(200).json(statusObj)
}

export async function deleteCsvErrorHandler(
  req: Request,
  res: Response
): Promise<Response> {
  const campaignId = +req.params.campaignId
  await UploadService.deleteS3TempKeys(campaignId)
  return res.status(200).json({ id: campaignId })
}

export async function previewFirstMessage(
  req: Request,
  res: Response
): Promise<Response> {
  const campaignId = +req.params.campaignId
  return res.status(200).json({
    preview: await GovsgTemplateService.getHydratedMessage(campaignId),
  })
}
