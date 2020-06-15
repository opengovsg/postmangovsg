import { Request, Response, NextFunction } from 'express'
import config from '@core/config'
import logger from '@core/logger'
import { AuthService } from '@core/services'

/**
 *  Determines if an email is whitelisted / enough time has elapsed since the last otp request,
 *  and sends an otp to that email if allowed
 * @param req
 * @param res
 */
const getOtp = async (req: Request, res: Response): Promise<Response> => {
  const email = req.body.email
  try {
    await AuthService.canSendOtp(email)
  } catch (e) {
    logger.error(`Not allowed to send OTP to email=${email}`)
    return res.sendStatus(401)
  }
  try {
    await AuthService.sendOtp(email)
  } catch (e) {
    logger.error(`Error sending OTP: ${e}. email=${email}`)
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
  const authorized = await AuthService.verifyOtp({ email, otp })
  if (!authorized) {
    return res.sendStatus(401)
  }
  try {
    if (req.session) {
      const user = await AuthService.findOrCreateUser(email)
      req.session.user = {
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
      return res.sendStatus(200)
    }
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
    const user = await AuthService.findUser(req?.session?.user?.id)
    return res.json({ email: user?.email, id: user?.id })
  }
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
    if (AuthService.checkCookie(req)) {
      return next()
    }

    const user = await AuthService.getUserForApiKey(req)
    if (user !== null && req.session) {
      // Ideally, we store the user id in res.locals for api key, because theoretically, no session was created.
      // Practically, we have to check multiple places for the user id when we want to retrieve the id
      // To avoid these checks, we assign the user id to the session property instead so that downstream middlewares can use it
      req.session.user = user
      req.session.apiKey = true
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
      res.cookie(config.get('session.cookieName'), '', { expires: new Date() }) // Makes cookie expire immediately
      if (!err) {
        resolve(res.sendStatus(200))
      }
      reject(err)
    })
  }).catch((err) => next(err))
}

export const AuthMiddleware = {
  getOtp,
  verifyOtp,
  getUser,
  isCookieOrApiKeyAuthenticated,
  logout,
}
