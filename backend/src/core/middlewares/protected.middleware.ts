import { Request, Response, NextFunction } from 'express'
import { ProtectedService } from '@core/services'
import { loggerWithLabel } from '@core/logger'
import {
  ApiAuthorizationError,
  ApiInvalidTemplateError,
} from '@core/errors/rest-api.errors'

const logger = loggerWithLabel(module)

/**
 * Limit certain routes for protected campaigns only
 * @param req
 * @param res
 * @param next
 */
const isProtectedCampaign = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const { campaignId } = req.params
  if (await ProtectedService.isProtectedCampaign(+campaignId)) {
    return next()
  }

  throw new ApiAuthorizationError('Campaign is not a protected campaign.')
}

/**
 * Ensure that the template body only has the necessary keywords if it is a protected campaign.
 * Subject should not have any keywords.
 * @param req
 * @param res
 * @param next
 */
const verifyTemplate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // If it is not a protected campaign, move on to the next middleware
    const { campaignId } = req.params
    if (!(await ProtectedService.isProtectedCampaign(+campaignId))) {
      return next()
    }

    const { subject, body } = req.body

    ProtectedService.checkTemplateVariables(
      subject,
      [],
      ['protectedlink', 'recipient']
    )
    ProtectedService.checkTemplateVariables(
      body,
      ['protectedlink'],
      ['recipient']
    )

    return next()
  } catch (err) {
    logger.error({
      message: 'Failed to verify template',
      error: err,
      action: 'verifyTemplate',
    })
    throw new ApiInvalidTemplateError((err as Error).message)
  }
}

/**
 * Retrieves a message for this campaign
 * @param req
 * @param res
 * @param next
 */
const verifyPasswordHash = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params
    const { password_hash: passwordHash } = req.body
    const protectedMessage = await ProtectedService.getProtectedMessage(
      id,
      passwordHash
    )
    const logMeta = { messageId: id, action: 'verifyPasswordHash' }

    if (!protectedMessage) {
      // Return 403 if nothing retrieved from db
      logger.error({ message: 'Wrong password or message id', ...logMeta })
      return res
        .status(403)
        .json({ message: 'Wrong password or message id. Please try again.' })
    }
    return res.json({ payload: protectedMessage.payload })
  } catch (err) {
    return next(err)
  }
}

export const ProtectedMiddleware = {
  isProtectedCampaign,
  verifyTemplate,
  verifyPasswordHash,
}
