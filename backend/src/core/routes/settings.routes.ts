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

const demoDisplayedValidator = {
  [Segments.BODY]: Joi.object({
    is_displayed: Joi.boolean().required(),
  }),
}

// Only allow updating with versions less than or equal to the current package version
const compareSemverMethod = (value: string, helpers: any) => {
  const currentPackageVersion = process.env.npm_package_version
  const updatingVersion = value

  const currentSplit = currentPackageVersion
    ?.split('.')
    .map((num) => parseInt(num, 10))
  const updatingSplit = updatingVersion
    .split('.')
    .map((num) => parseInt(num, 10))
  for (let i = 0; i < 3; i++) {
    if ((!currentSplit || currentSplit[i]) < updatingSplit[i]) {
      return helpers.error('any.invalid')
    }
  }
  return value
}

const updateAnnouncementVersionValidator = {
  [Segments.BODY]: Joi.object({
    announcement_version: Joi.string()
      .pattern(new RegExp('[0-9]{1,2}.[0-9]{1,2}.[0-9]{1,2}'))
      .custom(compareSemverMethod)
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
 *                  type: string
 *
 */
router.get(
  '/:channelType/credentials',
  celebrate(getCredentialsValidator),
  SettingsMiddleware.getChannelSpecificCredentials
)

/**
 * @swagger
 * path:
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
  SettingsMiddleware.updateDemoDisplayed
)

/**
 * @swagger
 * path:
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
  SettingsMiddleware.updateAnnouncementVersion
)

export default router
