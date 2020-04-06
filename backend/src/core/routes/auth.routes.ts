import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { getOtp, verifyOtp } from '@core/middlewares'

const router = Router()

// validators
const getOtpValidator = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email()
      .required(), // TODO: Add other validation 
  }),
}

const verifyOtpValidator = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email()
      .required(), // TODO: Add other validation
    otp: Joi.string().required(), //TODO: Add validation for 6 digit otp
  }),
}

// actual routes here

/**
 * @swagger
 * path:
 *  /auth/otp:
 *    post:
 *      tags:
 *        - Authentication
 *      summary: Get otp for user
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                email:
 *                  type: string
 *              required:
 *              - email
 *                  
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.post('/otp', celebrate(getOtpValidator), getOtp)

/**
 * @swagger
 * path:
 *  /auth/login:
 *    post:
 *      summary: Verify user otp
 *      tags:
 *        - Authentication
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                email:
 *                  type: string
 *                otp: 
 *                   type: string
 *              required:
 *              - email
 *              - otp
 *                  
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *        "401":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.post('/login', celebrate(verifyOtpValidator), verifyOtp)

export default router