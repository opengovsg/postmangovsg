import { Request, Response } from 'express'

export const getRequestIp: (req: Request) => string = (req: Request) => {
  /**
   * @see: https://support.cloudflare.com/hc/en-us/articles/200170786
   * @see: https://stackoverflow.com/a/52026771
   */
  return req.get('cf-connecting-ip') ?? req.ip
}

export const redirectTo =
  (path: string) =>
  (req: Request, res: Response): void => {
    const { baseUrl: campaignUrl, originalUrl } = req
    const parsedUrl = new URL(originalUrl, 'https://base')
    const redirectToPath = `${campaignUrl}${path}${parsedUrl.search}`
    return res.redirect(307, redirectToPath)
  }
