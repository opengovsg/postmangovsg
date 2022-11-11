import { Router } from 'express'
import { ChannelType } from '@shared/core/constants'
import { celebrate, Joi, Segments } from 'celebrate'

import { SettingsMiddleware } from '@core/middlewares'

export const InitSettingsRoute = (
  settingsMiddleware: SettingsMiddleware
): Router => {
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

  const demoDisplayedValidator = {
    [Segments.BODY]: Joi.object({
      is_displayed: Joi.boolean().required(),
    }),
  }

  // The version has to be a SHA-256 hash written in base64.
  const updateAnnouncementVersionValidator = {
    [Segments.BODY]: Joi.object({
      announcement_version: Joi.string().base64().length(44).required(),
    }),
  }

  /**
   * paths:
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
  router.get('/', settingsMiddleware.getUserSettings)

  /**
   * paths:
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
  router.post('/regen', settingsMiddleware.regenerateApiKey)

  /**
   * paths:
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
    settingsMiddleware.deleteUserCredential
  )

  /**
   * paths:
   *  /settings/{channelType}/credentials:
   *    get:
   *      summary: Retrieve channel specific credentials for user
   *      tags:
   *        - Settings
   *      parameters:
   *        - name: channelType
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
   *                  type: string
   *
   */
  router.get(
    '/:channelType/credentials',
    celebrate(getCredentialsValidator),
    settingsMiddleware.getChannelSpecificCredentials
  )

  /**
   * paths:
   *  /settings/demo:
   *    put:
   *       tags:
   *         - Settings
   *       summary: Update whether to display demos
   *       requestBody:
   *         required: true
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 is_displayed:
   *                   type: boolean
   *       responses:
   *         "200":
   *           description: Success
   *           content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  is_displayed:
   *                    type: boolean
   *         "400":
   *           description: Bad Request
   *         "401":
   *           description: Unauthorized
   *         "500":
   *           description: Internal Server Error
   */
  router.put(
    '/demo',
    celebrate(demoDisplayedValidator),
    settingsMiddleware.updateDemoDisplayed
  )

  /**
   * paths:
   *  /settings/announcement-version:
   *    put:
   *       tags:
   *         - Settings
   *       summary: Update announcement version for this user
   *       requestBody:
   *         required: true
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 announcement_version:
   *                   type: string
   *       responses:
   *         "200":
   *           description: Success
   *           content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  announcement_version:
   *                    type: number
   *         "400":
   *           description: Bad Request
   *         "401":
   *           description: Unauthorized
   *         "500":
   *           description: Internal Server Error
   */
  router.put(
    '/announcement-version',
    celebrate(updateAnnouncementVersionValidator),
    settingsMiddleware.updateAnnouncementVersion
  )

  return router
}
