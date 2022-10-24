import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { AuthService } from '@core/services'
import { getRequestIp } from '@core/utils/request'
import { Handler, NextFunction, Request, Response } from 'express'

export interface AuthMiddleware {
  getOtp: Handler
  verifyOtp: Handler
  getUser: Handler
  isCookieOrApiKeyAuthenticated: Handler
  logout: Handler
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const InitAuthMiddleware = (authService: AuthService) => {
  const logger = loggerWithLabel(module)

  /**
   *  Determines if an email is whitelisted / enough time has elapsed since the last otp request,
   *  and sends an otp to that email if allowed
   * @param req
   * @param res
   */
  const getOtp = async (req: Request, res: Response): Promise<Response> => {
    const email = req.body.email
    const logMeta = { email, action: 'getOTP' }

    try {
      await authService.canSendOtp(email)
    } catch (e) {
      logger.error({
        message: 'Not allowed to send OTP',
        ...logMeta,
        error: e,
      })
      return res.status(401).json({ message: (e as Error).message })
    }
    try {
      const ipAddress = getRequestIp(req)
      await authService.sendOtp(email, ipAddress)
    } catch (e) {
      logger.error({
        message: 'Error sending OTP',
        ...logMeta,
        error: e,
      })
      return res.sendStatus(500)
    }
    return res.sendStatus(200)
  }

  /**
   * Verifies that user input matches otp stored in redis
   * @param req
   * @param res
   * @param next
   */
  const verifyOtp = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const { email, otp } = req.body
    const logMeta = { email, action: 'verifyOTP' }
    const authorized = await authService.verifyOtp({ email, otp })
    if (!authorized) {
      logger.error({ message: 'Failed to verify OTP for email', ...logMeta })
      return res.sendStatus(401)
    }
    try {
      if (req.session) {
        const user = await authService.findOrCreateUser(email)
        req.session.user = {
          id: user.id,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          email: user.email,
        }
        return res.sendStatus(200)
      }
      logger.error({ message: 'Session object not found!', ...logMeta })
      return res.sendStatus(401)
    } catch (err) {
      return next(err)
    }
  }

  /**
   * Checks if user is logged in, and returns their email if they are
   * @param req
   * @param res
   */
  const getUser = async (
    req: Request,
    res: Response
  ): Promise<Response | void> => {
    if (req?.session?.user?.id) {
      const user = await authService.findUser(req?.session?.user?.id)
      logger.info({
        message: 'Existing user session found',
        action: 'getUser',
      })
      return res.json({ email: user?.email, id: user?.id })
    }
    logger.info({
      message: 'No existing user session found!',
      action: 'getUser',
    })
    return res.json({})
  }

  /**
   * Checks that request has a valid cookie (based on session), or a valid Authorization header
   * @param req
   * @param res
   * @param next
   */
  const isCookieOrApiKeyAuthenticated = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      if (authService.checkCookie(req)) {
        logger.info({
          message: 'User authenticated by cookie',
          action: 'isCookieOrApiKeyAuthenticated',
          user: req.session?.user,
        })
        return next()
      }

      const user = await authService.getUserForApiKey(req)
      if (user !== null && req.session) {
        // Ideally, we store the user id in res.locals for api key, because theoretically, no session was created.
        // Practically, we have to check multiple places for the user id when we want to retrieve the id
        // To avoid these checks, we assign the user id to the session property instead so that downstream middlewares can use it
        req.session.user = user
        req.session.apiKey = true
        logger.info({
          message: 'User authenticated by API key',
          action: 'isCookieOrApiKeyAuthenticated',
          user,
        })
        return next()
      }

      return res.sendStatus(401)
    } catch (err) {
      return next(err)
    }
  }

  /**
   * Destroys user's session
   * @param req
   * @param res
   * @param next
   */
  const logout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    return new Promise<Response | void>((resolve, reject) => {
      req.session?.destroy((err) => {
        res.cookie(config.get('session.cookieName'), '', {
          expires: new Date(),
        }) // Makes cookie expire immediately
        if (!err) {
          return resolve(res.sendStatus(200))
        }
        logger.error({
          message: 'Failed to destroy session',
          error: err,
          action: 'logout',
        })
        reject(err)
      })
    }).catch((err) => next(err))
  }

  return {
    getOtp,
    verifyOtp,
    getUser,
    isCookieOrApiKeyAuthenticated,
    logout,
  }
}
