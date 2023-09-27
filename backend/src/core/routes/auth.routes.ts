import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { AuthMiddleware } from '@core/middlewares'

export const InitAuthRoutes = (authMiddleware: AuthMiddleware): Router => {
  const router = Router()

  // validators
  const getOtpValidator = {
    [Segments.BODY]: Joi.object({
      email: Joi.string()
        .email()
        .options({ convert: true }) // Converts email to lowercase if it isn't
        .lowercase()
        .required(), // validation for email ending in whitelisted domains was removed as we want to support other manually whitelisted emails
    }),
  }

  const verifyOtpValidator = {
    [Segments.BODY]: Joi.object({
      email: Joi.string()
        .email()
        .options({ convert: true }) // Converts email to lowercase if it isn't
        .lowercase()
        .required(),
      otp: Joi.string()
        .length(6)
        .pattern(/^[A-Z0-9]+$/, { name: 'alphanumeric' })
        .required(),
    }),
  }

  const verifySgidCodeValidator = {
    [Segments.BODY]: Joi.object({
      code: Joi.string().required(),
    }),
  }

  const selectSgidProfileValidator = {
    [Segments.BODY]: Joi.object({
      workEmail: Joi.string().required(),
    }),
  }

  // actual routes here

  /**
   * paths:
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
  router.post('/otp', celebrate(getOtpValidator), authMiddleware.getOtp)

  /**
   * paths:
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
  router.post('/login', celebrate(verifyOtpValidator), authMiddleware.verifyOtp)

  /**
   * paths:
   *  /auth/login/sgid:
   *    get:
   *      summary: Get the authorisation url for sgID login
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
  router.get('/login/sgid', authMiddleware.getSgidUrl)

  /**
   * paths:
   *  /auth/login/sgid:
   *    post:
   *      summary: Verify sgid authorisation code
   *      tags:
   *        - Authentication
   *      requestBody:
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                code:
   *                   type: string
   *              required:
   *              - code
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
  router.post(
    '/login/sgid',
    celebrate(verifySgidCodeValidator),
    authMiddleware.verifySgidResponse
  )

  /**
   * paths:
   *  /auth/login/sgid/profile:
   *    post:
   *      summary: Select sgid profile to login with
   *      tags:
   *        - Authentication
   *      requestBody:
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                workEmail:
   *                   type: string
   *              required:
   *              - workEmail
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
  router.post(
    '/login/sgid/profile',
    celebrate(selectSgidProfileValidator),
    authMiddleware.selectSgidProfile
  )

  /**
   * paths:
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
  router.get('/userinfo', authMiddleware.getUser)

  /**
   * paths:
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
  router.get('/logout', authMiddleware.logout)

  return router
}
