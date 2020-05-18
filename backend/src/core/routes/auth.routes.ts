import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { AuthMiddleware } from '@core/middlewares'

const router = Router()

// validators
const getOtpValidator = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email()
      .options({ convert: true }) // Converts email to lowercase if it isn't
      .lowercase()
      .required(), // validation for email ending in .gov.sg was removed as we want to support other manually whitelisted emails
  }),
}

const verifyOtpValidator = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email()
      .options({ convert: true }) // Converts email to lowercase if it isn't  
      .lowercase()
      .required(),
    otp: Joi.string()
      .length(6)
      .pattern(/^\d+$/, { name: "numbers" })
      .required(),
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
 *        "500":
 *           description: Internal Server Error
 */
router.post('/otp', celebrate(getOtpValidator), AuthMiddleware.getOtp)

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
 *        "500":
 *           description: Internal Server Error
 */
router.post('/login', celebrate(verifyOtpValidator), AuthMiddleware.verifyOtp)

/**
 * @swagger
 * path:
 *  /auth/userinfo:
 *    get:
 *      summary: get logged in user info
 *      tags:
 *        - Authentication
 *                  
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  email:
 *                    type: string
 *        
 */
router.get('/userinfo', AuthMiddleware.getUser)

/**
 * @swagger
 * path:
 *  /auth/logout:
 *    get:
 *      summary: logs user out
 *      tags:
 *        - Authentication
 *                  
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *        "500":
 *           description: Internal Server Error
 */
router.get('/logout', AuthMiddleware.logout)

export default router
