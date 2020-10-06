import { Request, Response, NextFunction, RequestHandler } from 'express'
import config from '@core/config'

export const getRequestIp: (req: Request) => string = (req: Request) => {
  /**
   * @see: https://support.cloudflare.com/hc/en-us/articles/200170786
   * @see: https://stackoverflow.com/a/52026771
   */
  return req.get('cf-connecting-ip') ?? req.ip
}

const createJitter = ({
  windowMs,
  maxJitterMs,
  delayAfter,
}: {
  windowMs: number
  maxJitterMs: number
  delayAfter: number
}): RequestHandler => {
  const status = { inWindow: 0 }
  let currentTime = Date.now()
  const jitter = (_req: Request, res: Response, next: NextFunction): void => {
    status.inWindow += 1
    const now = Date.now()
    if (now - currentTime > windowMs) {
      currentTime = now
      status.inWindow = Math.max(status.inWindow - delayAfter, 0)
    }
    if (status.inWindow > delayAfter) {
      // Acknowledge
      res.sendStatus(202)
      // Wait to process further
      setTimeout(() => {
        return next()
      }, Math.ceil(Math.random() * maxJitterMs))
    } else {
      return next()
    }
  }
  return jitter
}

export const jitter = createJitter(config.get('callbackJitterOptions'))
