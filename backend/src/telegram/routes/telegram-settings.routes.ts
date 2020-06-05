import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import { TelegramMiddleware } from '@telegram/middlewares'
import { SettingsMiddleware } from '@core/middlewares'

const router = Router()

// Validators

const storeCredentialValidator = {
  [Segments.BODY]: Joi.object({
    label: Joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-z0-9-]+$/)
      .required(),
    telegram_bot_token: Joi.string().trim().required(),
  }),
}

// Routes

/**
 * @swagger
 * path:
 *  /settings/telegram/credentials:
 *    post:
 *      summary: Store new telegram credentials for user
 *      tags:
 *        - Settings
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                telegram_bot_token:
 *                  type: string
 *                label:
 *                  type: string
 *                  pattern: '/^[a-z0-9-]+$/'
 *                  minLength: 1
 *                  maxLength: 50
 *                  description: should only consist of lowercase alphanumeric characters and dashes
 *
 *      responses:
 *        200:
 *          description: OK
 *        400:
 *          description: Bad Request (invalid credentials, malformed request, duplicate labels)
 *
 */
router.post(
  '/credentials',
  celebrate(storeCredentialValidator),
  SettingsMiddleware.checkUserCredentialLabel,
  TelegramMiddleware.getCredentialsFromBody,
  TelegramMiddleware.validateAndStoreCredentials,
  SettingsMiddleware.storeUserCredential
)

export default router
