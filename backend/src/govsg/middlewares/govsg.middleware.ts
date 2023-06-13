import {
  ApiAuthorizationError,
  ApiNotFoundError,
} from '@core/errors/rest-api.errors'
import { loggerWithLabel } from '@core/logger'
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
