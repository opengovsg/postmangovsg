import { Request, Response, NextFunction } from 'express'
import { ListService } from '@core/services'
import { loggerWithLabel } from '@core/logger'
import { ChannelType } from '@core/constants'

const logger = loggerWithLabel(module)

/**
 *  Change the status of existing jobs for that campaign to STOPPED
 * @param req
 * @param res
 * @param next
 */
const getListsByChannel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    logger.info({
      message: 'Get lists by channel',
      action: 'getListsByChannel',
    })
    const userId = req.session?.user?.id
    const { channel } = req.params
    const rawLists = await ListService.listLists({
      userId,
      channel: channel as ChannelType,
    })
    const cleanedLists = rawLists.map((list) => {
      return { id: list.id, name: list.name }
    })
    return res.status(200).json({ lists: cleanedLists })
  } catch (err) {
    return next(err)
  }
}

export const ListMiddleware = {
  getListsByChannel,
}
