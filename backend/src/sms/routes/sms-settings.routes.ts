import { Request, Response } from 'express'
import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import { SmsMiddleware } from '@sms/middlewares'
import { SettingsMiddleware } from '@core/middlewares'

export const InitSmsSettingsRoute = (
  smsMiddleware: SmsMiddleware,
  settingsMiddleware: SettingsMiddleware
): Router => {
  const router = Router()

  const storeCredentialValidator = {
    [Segments.BODY]: Joi.object({
      label: Joi.string()
        .min(1)
        .max(50)
        .pattern(/^[a-z0-9-]+$/)
        .required(),
      twilio_account_sid: Joi.string().trim().required(),
      twilio_api_secret: Joi.string().trim().required(),
      twilio_api_key: Joi.string().trim().required(),
      twilio_messaging_service_sid: Joi.string().trim().required(),
      recipient: Joi.string().trim().required(),
    }),
  }

  const verifyCredentialValidator = {
    [Segments.BODY]: Joi.object({
      recipient: Joi.string().trim().required(),
      label: Joi.string().required(),
    }),
  }

  /**
   * @swagger
   * paths:
   *  /settings/sms/credentials:
   *    post:
   *      summary: Store new twilio credentials for user
   *      tags:
   *        - Settings
   *      requestBody:
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              allOf:
   *                - $ref: '#/components/schemas/TwilioCredentials'
   *                - type: object
   *                  properties:
   *                    label:
   *                      type: string
   *                      pattern: '/^[a-z0-9-]+$/'
   *                      minLength: 1
   *                      maxLength: 50
   *                      description: should only consist of lowercase alphanumeric characters and dashes
   *                    recipient:
   *                      type: string
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
    smsMiddleware.canValidateCredentials,
    smsMiddleware.getCredentialsFromBody,
    smsMiddleware.validateAndStoreCredentials,
    settingsMiddleware.storeUserCredential
  )

  /**
   * @swagger
   * paths:
   *  /settings/sms/credentials/verify:
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
    smsMiddleware.canValidateCredentials,
    smsMiddleware.getCredentialsFromLabel,
    smsMiddleware.validateAndStoreCredentials,
    (_req: Request, res: Response) => res.sendStatus(200)
  )

  return router
}
