import { getRequestIp } from '@core/utils/request'
import { Request, Response } from 'express'

const clientIp = (req: Request, _res: Response): string => getRequestIp(req)

const userId = (req: Request, _res: Response): string | undefined => {
  const apiKey = req?.session?.apiKey
  const userId = req?.session?.user?.id
  return userId ? `${userId}${apiKey ? '-api' : ''}` : undefined
}

export { clientIp, userId }
