import { Request, Response } from 'express'
import { isArray } from 'lodash'

const clientIp = (req: Request, _res: Response): string => {
  /**
   * @see: https://support.cloudflare.com/hc/en-us/articles/200170786
   * @see: https://stackoverflow.com/a/52026771
   */
  const cfConnectingIp: string | undefined = isArray(
    req.headers['cf-connecting-ip']
  )
    ? req.headers['cf-connecting-ip'].join(',')
    : req.headers['cf-connecting-ip']

  return cfConnectingIp || req.ip
}

const userId = (req: Request, _res: Response): string | undefined => {
  return req?.session?.user?.id
}

export { clientIp, userId }