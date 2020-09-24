import { Router } from 'express'

import { EmailMiddleware } from '@email/middlewares'

import { celebrate, Joi, Segments } from 'celebrate'

const router = Router()

// validators
const verifyValidator = {
  [Segments.BODY]: Joi.object({}),
}

/**
 * @swagger
 * path:
 *  /settings/email/verify:
 *    post:
 *      summary: Verifies the user's email address to see if it can be used to send out emails
 *      tags:
 *        - Settings
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                from:
 *                  type: string
 *
 *      responses:
 *        200:
 *          description: OK
 *        400:
 *          description: Bad Request (verification fails)
 *
 */
router.post(
  '/verify',
  celebrate(verifyValidator),
  EmailMiddleware.verifyFromAddress,
  EmailMiddleware.storeFromAddress
)

/**
 * @swagger
 * path:
 *  /settings/email/verify:
 *    get:
 *      summary: Returns the user's email address if it is a valid custom 'from' email address.
 *      tags:
 *        - Settings
 *
 *      responses:
 *        200:
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  email:
 *                    type: string
 *        500:
 *          description: Internal Server Error
 *
 */
router.get('/verify', EmailMiddleware.getCustomFromAddress)

export default router
