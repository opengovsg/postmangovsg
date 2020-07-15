import { Request, Response, NextFunction } from 'express'
import { ProtectedService } from '@core/services'
import logger from '@core/logger'

/**
 * Ensure that the template body only has the necessary keywords if it is a protected campaign.
 * Subject should not have any keywords.
 * @param req
 * @param res
 * @param next
 */
const verifyTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // If it is not a protected campaign, move on to the next middleware
    if (!res.locals.isProtected) {
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
    logger.error(`${err.message}`)
    return res.status(500).json({ message: err.message })
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
    if (!protectedMessage) {
      // Return not found if nothing retrieved from db
      return res.sendStatus(404)
    }
    return res.json({ payload: protectedMessage.payload })
  } catch (err) {
    return next(err)
  }
}

export const ProtectedMiddleware = {
  verifyTemplate,
  verifyPasswordHash,
}
