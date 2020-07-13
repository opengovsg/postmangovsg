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
    // If it is not a protected campaign, move on to the next middleware
    if (!res.locals.isProtected) {
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
    const { uuid } = req.params
    const { hashedPassword } = req.body
    const protectedMessage = await ProtectedService.findProtectedMessage(uuid)
    if (!protectedMessage) return res.sendStatus(404)

    const payload = await ProtectedService.verifyPasswordHash(
      protectedMessage,
      hashedPassword
    )

    if (!payload) return res.sendStatus(401)
    return res.json({ payload })
  } catch (err) {
    return next(err)
  }
}

export const ProtectedMiddleware = {
  verifyTemplateBody,
  verifyPasswordHash,
}
