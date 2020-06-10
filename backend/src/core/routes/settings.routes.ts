import { Router } from 'express'
import { ChannelType } from '@core/constants'
import { celebrate, Joi, Segments } from 'celebrate'

import { SettingsMiddleware } from '@core/middlewares'

const router = Router()

const deleteCredentialValidator = {
  [Segments.BODY]: Joi.object({
    label: Joi.string().required(),
  }),
}

const getCredentialsValidator = {
  [Segments.PARAMS]: Joi.object({
    channelType: Joi.string()
      .uppercase()
      .valid(ChannelType.SMS, ChannelType.Telegram)
      .required(),
  }),
}

/**
 * @swagger
 * path:
 *  /settings:
 *    get:
 *      summary: Retrieve stored settings for user
 *      tags:
 *        - Settings
 *
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  has_api_key:
 *                    type: boolean
 *                  creds:
 *                    type: array
 *                    items:
 *                      type: object
 *                      properties:
 *                        label:
 *                          type: string
 *                        type:
 *                          $ref: '#/components/schemas/ChannelType'
 *
 */
router.get('/', SettingsMiddleware.getUserSettings)

/**
 * @swagger
 * path:
 *  /settings/regen:
 *    post:
 *      summary: Regenerates api key
 *      tags:
 *        - Settings
 *
 *      responses:
 *        200:
 *          description: Success
 *          content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   api_key:
 *                     type: string
 *
 */
router.post('/regen', SettingsMiddleware.regenerateApiKey)

/**
 * @swagger
 * path:
 *  /settings/credentials:
 *    delete:
 *      summary: Deletes stored credential for user
 *      tags:
 *        - Settings
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                label:
 *                  type: string
 *
 *      responses:
 *        200:
 *          description: OK
 *        400:
 *          description: Bad Request
 *
 */
router.delete(
  '/credentials',
  celebrate(deleteCredentialValidator),
  SettingsMiddleware.deleteUserCredential
)

/**
 * @swagger
 * path:
 *  /settings/{channelType}/credentials:
 *    get:
 *      summary: Retrieve channel specific credentials for user
 *      tags:
 *        - Settings
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *            enum: [SMS, TELEGRAM]
 *
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    label:
 *                     type: string
 *
 */
router.get(
  '/:channelType/credentials',
  celebrate(getCredentialsValidator),
  SettingsMiddleware.getChannelSpecificCredentials
)

export default router
