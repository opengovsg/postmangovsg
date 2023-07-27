import { loggerWithLabel } from '@core/logger'
import { NextFunction, Request, Response } from 'express'

import { PhonebookService } from '@core/services/phonebook.service'
import { ChannelType } from '@core/constants'
import { ApiValidationError } from '@core/errors/rest-api.errors'

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

const verifyListBelongsToUser =
  (channel: ChannelType) =>
  async (req: Request, _: Response, next: NextFunction) => {
    const userId = req.session?.user?.id
    const { list_id: listId } = req.body

    try {
      const lists = await PhonebookService.getPhonebookLists({
        userId,
        channel,
      })

      if (lists.some((list) => list.id === listId)) {
        // listid belongs to the user. Ok to proceed
        return next()
      } else {
        throw new Error('List does not belong to user')
      }
    } catch (err) {
      logger.error({
        action: 'verifyListBelongsToUser',
        message: err,
      })
      throw new ApiValidationError('This listId does not belong to this user')
    }
  }

export const PhonebookMiddleware = {
  getListsByChannel,
  verifyListBelongsToUser,
}
