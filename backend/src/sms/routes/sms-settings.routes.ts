import { Router, NextFunction, Request, Response } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import { ChannelType } from '@core/constants'
import { validateAndStoreCredentials, parseCredentials } from '@sms/middlewares'
import { storeUserCredential, checkUserCredentialLabel, getChannelSpecificCredentials } from '@core/middlewares'

const router = Router()

const storeCredentialValidator = {
  [Segments.BODY]: Joi.object({
    label: Joi.string()
      .min(4)
      .max(255)
      .lowercase()
      .pattern(/^[\w\d-]+$/)
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

const passChannelType = (_req: Request, res: Response, next: NextFunction): void => {
  res.locals.channelType = ChannelType.SMS
  next()
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
 *                      pattern: '/^[\w\d-]+$/'
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
router.post('/credentials', celebrate(storeCredentialValidator), checkUserCredentialLabel, parseCredentials, validateAndStoreCredentials, storeUserCredential)

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
router.get('/credentials', celebrate(getCredentialsValidator), passChannelType, getChannelSpecificCredentials)


export default router