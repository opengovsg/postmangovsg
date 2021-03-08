import { Request, Response, NextFunction } from 'express'
import { UserFeature } from '@core/models'

/**
 *  Check if user is eligible for tesseract feature
 * @param req
 * @param res
 * @param next
 */
const isTesseractUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.session?.user?.id
    const feature = await UserFeature.findOne({
      where: { userId, tesseract: true },
    })
    if (!feature) {
      return res.sendStatus(403)
    }
    next()
  } catch (err) {
    return next(err)
  }
}

export const UserFeatureMiddleware = {
  isTesseractUser,
}
