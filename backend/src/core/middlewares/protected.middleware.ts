import { Request, Response, NextFunction } from 'express'
import { ProtectedService } from '@core/services'

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

export const ProtectedMiddleware = { verifyPasswordHash }
