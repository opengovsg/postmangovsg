import { loggerWithLabel } from '@core/logger'
import { Request, Response } from 'express'

import { PhonebookService } from '@core/services/phonebook.service'
import { ChannelType } from '@core/constants'

const logger = loggerWithLabel(module)

const getListsByChannel = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  logger.info({
    message: 'Get phonebook lists by channel',
    action: 'getListsByChannel',
  })
  const userId = req.session?.user?.id
  const { channel } = req.params

  const lists = await PhonebookService.getManagedLists({
    userId,
    channel: channel as ChannelType,
  })
  return res.status(200).json({ lists })
}

export const PhonebookMiddleware = {
  getListsByChannel,
}
