import { NextFunction, Request, Response, Router } from 'express'
import expressRateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { celebrate, Joi, Segments } from 'celebrate'
import config from '@core/config'
import { AuthMiddleware } from '@core/middlewares'
import { RedisService } from '@core/services'
import { getRequestIp } from '@core/utils/request'

export const InitAuthRoutes = (
  authMiddleware: AuthMiddleware,
  redisService: RedisService
): Router => {
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
        .length(8)
        .pattern(/^[A-Z0-9]+$/, { name: 'alphanumeric' })
        .required(),
    }),
  }

  // Cross-site HTML forms cannot send application/json, and cross-site scripts that do must pass
  // the CORS preflight, so this stops another site logging a browser into an account it controls
  const requireJsonBody = (
    req: Request,
    res: Response,
    next: NextFunction
  ): Response | void => {
    if (!req.is('application/json')) {
      return res
        .status(415)
        .json({ message: 'Content-Type must be application/json' })
    }
    return next()
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
   *        "415":
   *           description: Request body is not application/json
   *        "500":
   *           description: Internal Server Error
   */
  router.post(
    '/login',
    requireJsonBody,
    celebrate(verifyOtpValidator),
    authMiddleware.verifyOtp
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

  // one.gov.sg login
  if (config.get('oneGovSg.clientId')) {
    router.get(
      '/one-gov-sg/login',
      expressRateLimit({
        store: new RedisStore({
          prefix: 'oneGovSgLogin:',
          client: redisService.rateLimitClient,
          expiry: 1,
        }),
        windowMs: 1000,
        max: 5,
        keyGenerator: getRequestIp,
      }),
      authMiddleware.oneGovSgLogin
    )
    router.post('/one-gov-sg/callback', authMiddleware.oneGovSgCallback)
  }

  return router
}
