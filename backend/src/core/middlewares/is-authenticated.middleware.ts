import { Request, Response, NextFunction } from 'express'


export const isCookieAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  if (req.session?.user?.id) {
    return next()
  }
  return res.sendStatus(401)
}