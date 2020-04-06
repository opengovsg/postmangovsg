import { Request, Response, NextFunction } from 'express'
import { Project } from '@core/models'
import logger from '@core/logger'

// TODO
const verifyProjectOwner = async (_req: Request, _res: Response, next: NextFunction): Promise<Response | void> => {
  // const { projectId } = req.params
  next()
}

// Create project
const createProject = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { name, type }: { name: string; type: string} = req.body
    const { id } = req.session?.user
    await Project.create({ name, type, userId: id, valid: false }) 
    return res.sendStatus(201)
  }
  catch(err){
    logger.error(err)
    return next(err)
  }
 
}

// List projects
const listProjects = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'ok' })
}


export { verifyProjectOwner, createProject, listProjects }