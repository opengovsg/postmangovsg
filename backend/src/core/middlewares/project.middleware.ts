import { Request, Response, NextFunction } from 'express'
import { Project } from '@core/models'
import logger from '@core/logger'
import { Sequelize } from 'sequelize-typescript'

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
const listProjects = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { offset, limit } = req.query 
    const { id : userId } = req.session?.user
    const options: { where: any; attributes: any; order: any; offset?: number; limit? : number} = {
      where: {
        userId,
      },
      attributes: [
        'id', 'name', 'type', 'createdAt', 'valid', [Sequelize.literal('CASE WHEN "credName" IS NULL THEN False ELSE True END'), 'hasCredential'],
      ],
      order: [
        ['createdAt', 'DESC'],
      ],
    }
    if (offset) {
      options.offset = +offset
    }
    if(limit){
      options.limit = +limit
    }
  
    const projects = await Project.findAll(options)
    return res.json(projects)
  }catch(err){
    logger.error(err)
    return next(err)
  }
}


export { verifyProjectOwner, createProject, listProjects }