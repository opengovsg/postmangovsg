import { ChannelType } from '@core/constants'
import {
  ApiAuthorizationError,
  ApiInternalServerError,
  ApiNotFoundError,
} from '@core/errors/rest-api.errors'
import { loggerWithLabel } from '@core/logger'
import { experimentService } from '@core/services'
import {
  CampaignGovsgTemplate,
  GovsgTemplate,
  GovsgTemplateParamMetadata,
} from '@govsg/models'
import { GovsgService } from '@govsg/services'
import { NextFunction, Request, Response } from 'express'

const logger = loggerWithLabel(module)

export const isGovsgCampaignOwnedByUser = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const campaignId = req.params.campaignId
  const userId = req.session?.user?.id
  const campaign = await GovsgService.findCampaign(+campaignId, +userId)
  if (!campaign || !userId) {
    throw new ApiAuthorizationError("User doesn't have access to this campaign")
  }
  next()
}

export const getCampaignDetails = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const campaign = await GovsgService.getCampaignDetails(+req.params.campaignId)
  return res.status(200).json(campaign)
}

export async function duplicateCampaign(req: Request, res: Response) {
  const campaignId = +req.params.campaignId
  const { name } = req.body
  const campaign = await GovsgService.duplicateCampaign({ campaignId, name })
  if (!campaign) {
    throw new ApiNotFoundError(
      `Cannot duplicate. Campaign ${campaignId} was  not found.`
    )
  }
  logger.info({
    message: 'Successfully copied campaign',
    campaignId: campaign.id,
    action: 'duplicateCampaign',
  })
  return res.status(201).json({
    id: campaign.id,
    name: campaign.name,
    created_at: campaign.createdAt,
    type: campaign.type,
    protect: campaign.protect,
    demo_message_limit: campaign.demoMessageLimit,
  })
}

export async function setDefaultCredentials(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  await GovsgService.setDefaultCredentials(+req.params.campaignId)
  return next()
}

export async function processSingleRecipientCampaign(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const campaignId = +req.params.campaignId
  const { params } = req.body
  const userId = req.session?.user?.id
  const [experimentalData, pivot] = await Promise.all([
    experimentService.getUserExperimentalData(userId),
    CampaignGovsgTemplate.findOne({
      where: { campaignId },
      include: {
        model: GovsgTemplate,
      },
    }),
  ])
  const defaultData = experimentalData[ChannelType.Govsg]
  if (pivot?.govsgTemplate.paramMetadata !== null) {
    const paramMeta = pivot?.govsgTemplate.paramMetadata as Record<
      string,
      GovsgTemplateParamMetadata
    >
    const fieldsToDefault = pivot?.govsgTemplate.params?.filter(
      (p) => !!paramMeta[p].defaultFromMetaField
    )
    const fieldsToSupply = pivot?.govsgTemplate.params?.filter(
      (p) => !!paramMeta[p].displayName
    )
    console.log(fieldsToDefault, defaultData)
    console.log(fieldsToSupply, params)
    if (fieldsToDefault?.some((f) => !defaultData[f])) {
      throw new ApiInternalServerError(
        'Missing some fields in default params data'
      )
    }
    if (fieldsToSupply?.some((f) => !params[f])) {
      throw new ApiInternalServerError(
        'Missing some fields in params data supplied'
      )
    }
  }

  const data = Object.assign({}, params, defaultData)
  await GovsgService.processSingleRecipientCampaign(data, campaignId)
  return next()
}
