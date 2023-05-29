import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { ChannelType } from '@core/constants'
import { PhonebookMiddleware } from '@core/middlewares/phonebook.middleware'

const router = Router()

const listByChannelValidator = {
  [Segments.PARAMS]: Joi.object({
    channel: Joi.string()
      .required()
      .valid(...Object.values(ChannelType)),
  }),
}

router.get(
  '/lists/:channel',
  celebrate(listByChannelValidator),
  PhonebookMiddleware.getListsByChannel
)

export default router
