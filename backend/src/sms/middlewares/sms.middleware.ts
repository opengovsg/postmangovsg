import { Request, Response, NextFunction } from 'express'

// TODO
const isSmsCampaign = async (_req: Request, _res: Response, next: NextFunction): Promise<Response | void> => {
  // const { campaignId } = req.params
  next()
}

export { isSmsCampaign }