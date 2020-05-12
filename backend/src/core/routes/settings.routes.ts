import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import { getUserSettings, deleteUserCredential, regenerateApiKey } from '@core/middlewares'

const router = Router()

const deleteCredentialValidator = {
  [Segments.BODY]: Joi.object({
    label: Joi
      .string()
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
router.get('/', getUserSettings)

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
router.post('/regen', regenerateApiKey)

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
router.delete('/credentials', celebrate(deleteCredentialValidator), deleteUserCredential)

export default router