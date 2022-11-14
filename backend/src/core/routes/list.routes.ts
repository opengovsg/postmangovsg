import { celebrate, Joi, Segments } from 'celebrate'
import { Router } from 'express'
import { ListMiddleware } from '@core/middlewares/list.middleware'
import { ChannelType } from '@core/constants'

const router = Router()

const listByChannelValidator = {
  [Segments.PARAMS]: Joi.object({
    channel: Joi.string()
      .required()
      .valid(...Object.values(ChannelType)),
  }),
}
/**
 * paths:
 *   /lists/{channel}:
 *     get:
 *       description: Get all lists for the specific channel
 *       tags:
 *         - List
 *       parameters:
 *         - name: channel
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       responses:
 *         200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                 lists:
 *                  type: array
 *         400:
 *           description: Bad Request (invalid request)
 *         500:
 *           description: Internal Server Error
 */
router.get(
  '/:channel',
  celebrate(listByChannelValidator),
  ListMiddleware.getListsByChannel
)

export default router
