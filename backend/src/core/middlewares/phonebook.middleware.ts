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

  try {
    const lists = await PhonebookService.getPhonebookLists({
      userId,
      channel: channel as ChannelType,
    })
    return res.status(200).json({ lists })
  } catch (e) {
    // explicitly return 200 if something goes wrong with phonebook API and not an error
    return res.status(200).json({ message: 'Could not retrieve lists.' })
  }
}

export const PhonebookMiddleware = {
  getListsByChannel,
}
