import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import { getUserSettings, deleteUserCredential, regenerateApiKey } from '@core/middlewares'

const router = Router()

const getUserSettingsValidation = {
  [Segments.QUERY]: Joi.object({}),
}
const deleteCredentialValidator = {
  [Segments.BODY]: Joi.object({
    label: Joi.string()
      .min(1)
      .max(50)
      .lowercase()
      .pattern(/^[\w\d-]+$/)
      .required(),
  }),
}

const regenerateApiKeyValidator = {
  [Segments.BODY]: Joi.object({}),
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
router.get('/', celebrate(getUserSettingsValidation), getUserSettings)

/**
 * @swagger
 * path:
 *  /settings/sms/credentials:
 *    post:
 *      summary: Store credential for user
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
 *                  pattern: '/^[\w\d-]+$/'
 *
 *      responses:
 *        200:
 *          description: OK
 *        400:
 *          description: Bad Request
 *                    
 */
router.delete('/credentials', celebrate(deleteCredentialValidator), deleteUserCredential)

/**
 * @swagger
 * path:
 *  /settings/sms/credential:
 *    post:
 *      summary: Store credential for user
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
 *                  pattern: '/^[\w\d-]+$/'
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
router.post('/regen', celebrate(regenerateApiKeyValidator), regenerateApiKey)

export default router