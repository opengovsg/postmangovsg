import { Request, Response, NextFunction, Handler } from 'express'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import {
  AuthService,
  OneGovSgCallbackError,
  OneGovSgIdentity,
  OneGovSgService,
} from '@core/services'
import { getRequestIp } from '@core/utils/request'
import { ApiAuthenticationError } from '@core/errors/rest-api.errors'

export interface AuthMiddleware {
  getOtp: Handler
  verifyOtp: Handler
  getUser: Handler
  getAuthMiddleware: (authTypes: AuthType[]) => Handler
  logout: Handler
  oneGovSgLogin: Handler
  oneGovSgCallback: Handler
}

export enum AuthType {
  Cookie = 'COOKIE',
  ApiKey = 'API_KEY',
}

export const InitAuthMiddleware = (
  authService: AuthService,
  oneGovSgService: OneGovSgService
) => {
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
        // A new session ID on login, so a cookie planted before login cannot be reused
        await new Promise<void>((resolve, reject) =>
          req.session?.regenerate((err) => (err ? reject(err) : resolve()))
        )
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
      return res.json({
        email: user?.email,
        id: user?.id,
        // Frontend bundles from before GovSG's removal read this on login and
        // crash without it. Remove one release after the frontend redeploys.
        experimental_data: {},
      })
    }
    logger.info({
      message: 'No existing user session found!',
      action: 'getUser',
    })
    return res.json({})
  }

  type Authenticator = (req: Request) => Promise<boolean>
  const authenticators: Record<AuthType, Authenticator> = {
    [AuthType.Cookie]: async (req: Request) => {
      const authenticated = authService.checkCookie(req)
      if (!authenticated) {
        return false
      }

      logger.info({
        message: 'User authenticated by cookie',
        action: 'authenticators[AuthType.Cookie]',
        user: req.session?.user,
      })
      return true
    },
    [AuthType.ApiKey]: async (req: Request) => {
      const user = await authService.getUserForApiKey(req)
      if (user === null) {
        return false
      }
      // Downstream middlewares read the user from req.session. The session middleware skips
      // API key requests, so this request-scoped object is never saved or sent as a cookie.
      req.session = {
        user,
        apiKey: true,
        rateLimit: user.rateLimit,
      } as unknown as Request['session']
      logger.info({
        message: 'User authenticated by API key',
        action: 'authenticators[AuthType.ApiKey]',
        user,
      })
      return true
    },
  }

  /**
   * - Generate an express middleware that authenticate requests if it passes the
   *   authenticator for one of the provided types in `acceptedAuthTypes`
   * - The generated middleware will attempt to authenticate requests using
   *   authenticators corresponding with `authType` in the same order as provided
   *   in `acceptedAuthTypes` array
   * @param acceptedAuthTypes
   */
  const getAuthMiddleware =
    (acceptedAuthTypes: AuthType[]) =>
    async (
      req: Request,
      _res: Response,
      next: NextFunction
    ): Promise<Response | void> => {
      for (const authType of acceptedAuthTypes) {
        const authenticated = await authenticators[authType](req)
        if (authenticated) {
          return next()
        }
      }

      throw new ApiAuthenticationError(
        'Unauthenticated request. Please try again with correct authentication'
      )
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
    // API key requests have no session to destroy
    if (!req.session) {
      return res.status(200).json({ oneGovSg: false })
    }
    const session = req.session
    // Read before destroy so the frontend can tell the user they're still signed in to one.gov.sg
    const oneGovSg = !!session.oneGovSgSid
    return new Promise<Response | void>((resolve, reject) => {
      session.destroy((err) => {
        res.cookie(config.get('session.cookieName'), '', {
          expires: new Date(),
        }) // Makes cookie expire immediately
        if (!err) {
          return resolve(res.status(200).json({ oneGovSg }))
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

  // Binds the IdP round-trip to this browser. Strict is fine: the frontend posts the callback same-site.
  const ONE_GOV_SG_TX_COOKIE = 'onegovsg_tx'
  const oneGovSgTxCookieOptions = (req: Request) => ({
    httpOnly: true,
    secure: config.get('session.cookieSettings.secure'),
    sameSite: 'strict' as const,
    path: `${req.baseUrl}/one-gov-sg/callback`,
  })

  /**
   * Starts a one.gov.sg login: stores state/nonce/PKCE verifier server-side and redirects to the IdP.
   */
  const oneGovSgLogin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const { txId, url } = await oneGovSgService.startLogin()
      res.cookie(ONE_GOV_SG_TX_COOKIE, txId, {
        ...oneGovSgTxCookieOptions(req),
        maxAge: 10 * 60 * 1000,
      })
      return res.redirect(url)
    } catch (e) {
      return next(e)
    }
  }

  /**
   * The frontend redirect_uri page posts the IdP's callback params here: validates them, verifies the
   * id_token, gates access, then creates a session
   */
  const oneGovSgCallback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const txId = req
      .get('cookie')
      ?.match(new RegExp(`(?:^|;\\s*)${ONE_GOV_SG_TX_COOKIE}=([\\w-]+)`))?.[1]
    res.clearCookie(ONE_GOV_SG_TX_COOKIE, oneGovSgTxCookieOptions(req))

    let identity: OneGovSgIdentity
    try {
      identity = await oneGovSgService.completeLogin(txId, req.body ?? {})
    } catch (e) {
      if (e instanceof OneGovSgCallbackError) {
        logger.warn({
          message: 'Rejected one.gov.sg callback',
          reason: e.message,
          action: 'oneGovSgCallback',
        })
        return res.status(400).json({ message: e.message })
      }
      return next(e)
    }

    // Authorization gate before provisioning
    // ponytail: one.gov.sg spec says gate on `sub` allowlist, not email domain. Kept Postman's
    // existing domain + manual-user whitelist by product decision; swap for a sub allowlist if that changes.
    try {
      if (!(await authService.isWhitelistedEmail(identity.email))) {
        logger.info({
          message: 'one.gov.sg user not authorized',
          action: 'oneGovSgCallback',
        })
        return res
          .status(403)
          .json({ message: 'Your account is not authorised to use Postman.' })
      }
      const user = await authService.findOrCreateUser(identity.email)
      if (!req.session) return next(new Error('Session object not found!'))
      await new Promise<void>((resolve, reject) =>
        req.session?.regenerate((err) => (err ? reject(err) : resolve()))
      )
      req.session.user = {
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        email: user.email,
      }
      req.session.oneGovSgSid = identity.sid // for future central logout
      return res.sendStatus(200)
    } catch (e) {
      return next(e)
    }
  }

  return {
    oneGovSgLogin,
    oneGovSgCallback,
    getOtp,
    verifyOtp,
    getUser,
    getAuthMiddleware,
    logout,
  }
}
