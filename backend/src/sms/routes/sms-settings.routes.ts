import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import { SmsMiddleware } from '@sms/middlewares'
import { SettingsMiddleware } from '@core/middlewares'

const router = Router()

const storeCredentialValidator = {
  [Segments.BODY]: Joi.object({
    label: Joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-z0-9-]+$/)
      .required(),
    'twilio_account_sid': Joi
      .string()
      .trim()
      .required(),
    'twilio_api_secret': Joi
      .string()
      .trim()
      .required(),
    'twilio_api_key': Joi
      .string()
      .trim()
      .required(),
    'twilio_messaging_service_sid': Joi
      .string()
      .trim()
      .required(),
    recipient: Joi
      .string()
      .trim()
      .required(),
  }),
}

const getCredentialsValidator = {
  [Segments.QUERY]: Joi.object({}),
}

/**
 * @swagger
 * path:
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
router.post('/credentials', celebrate(storeCredentialValidator), 
  SettingsMiddleware.checkUserCredentialLabel, 
  SmsMiddleware.getCredentialsFromBody, 
  SmsMiddleware.validateAndStoreCredentials, 
  SettingsMiddleware.storeUserCredential)

/**
 * @swagger
 * path:
 *  /settings/sms/credentials:
 *    get:
 *      summary: Retrieve stored sms credentials for user
 *      tags:
 *        - Settings
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
router.get('/credentials', celebrate(getCredentialsValidator), SettingsMiddleware.getChannelSpecificCredentials)


export default router