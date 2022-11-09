import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import { TelegramMiddleware } from '@telegram/middlewares'
import { SettingsMiddleware } from '@core/middlewares'

export const InitTelegramSettingsRoute = (
  telegramMiddleware: TelegramMiddleware,
  settingsMiddleware: SettingsMiddleware
): Router => {
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

  const verifyCredentialValidator = {
    [Segments.BODY]: Joi.object({
      recipient: Joi.string().trim().required(),
      label: Joi.string().required(),
    }),
  }

  // Routes

  /**
   * paths:
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
    settingsMiddleware.checkUserCredentialLabel,
    telegramMiddleware.getCredentialsFromBody,
    telegramMiddleware.validateAndStoreCredentials,
    settingsMiddleware.storeUserCredential
  )

  /**
   * paths:
   *  /settings/telegram/credentials/verify:
   *    post:
   *      summary: Verify stored credential for user
   *      tags:
   *        - Settings
   *      requestBody:
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                recipient:
   *                  type: string
   *                label:
   *                  type: string
   *
   *      responses:
   *        200:
   *          description: OK
   *        400:
   *          description: Bad Request (invalid credentials, malformed request)
   *
   */
  router.post(
    '/credentials/verify',
    celebrate(verifyCredentialValidator),
    telegramMiddleware.getCredentialsFromLabel,
    telegramMiddleware.sendValidationMessage
  )

  return router
}
