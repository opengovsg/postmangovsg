import { Request, Response, NextFunction } from 'express'
import { ListService } from '@core/services'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

/**
 *  Change the status of existing jobs for that campaign to STOPPED
 * @param req
 * @param res
 * @param next
 */
const getAllLists = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    logger.info({
      message: 'Get all lists',
      action: 'getAllLists',
    })
    const userId = req.session?.user?.id
    const rawLists = await ListService.listLists({ userId })
    const cleanedLists = rawLists.map((list) => {
      return { id: list.id, name: list.name }
    })
    return res.status(200).json({ lists: cleanedLists })

    // TODO: remove this
    logger.info(req)
  } catch (err) {
    return next(err)
  }
}

export const ListMiddleware = {
  getAllLists,
}
