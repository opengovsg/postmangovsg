import { Request, Response, NextFunction } from 'express'
import { ProtectedService } from '@core/services'
import logger from '@core/logger'

/**
 * Ensure that the template has the necessary keywords if it is a protected campaign.
 * @param req
 * @param res
 * @param next
 */
const verifyTemplateBody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const isProtectedCampaign = await ProtectedService.isProtectedCampaign(
      +campaignId
    )

    // If it is not a protected campaign, move on to the next middleware
    if (!isProtectedCampaign) {
      return next()
    }

    const { body } = req.body

    ProtectedService.checkTemplateVariables(body)

    return next()
  } catch (err) {
    logger.error(`${err.message}`)
    return res.status(500).json({ message: err.message })
  }
}

export const ProtectedMiddleware = {
  verifyTemplateBody,
}
