import { Request, Response, NextFunction } from 'express'

// TODO
const verifyProjectOwner = async (_req: Request, _res: Response, next: NextFunction): Promise<Response | void> => {
  // const { projectId } = req.params
  next()
}


export { verifyProjectOwner }