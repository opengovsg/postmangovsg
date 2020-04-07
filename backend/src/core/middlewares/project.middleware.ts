import S3 from 'aws-sdk/clients/s3'
import { Request, Response, NextFunction } from 'express'
import { Sequelize } from 'sequelize-typescript'
import { v4 as uuid } from 'uuid'

import config from '@core/config'
import logger from '@core/logger'
import { Project } from '@core/models'

const AWS_REGION = config.aws.awsRegion
const FILE_STORAGE_BUCKET_NAME = config.aws.uploadBucket

const s3 = new S3({
  signatureVersion: 'v4',
  region: AWS_REGION,
})


const verifyProjectOwner = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { projectId } = req.params
    // const { id: userId } = req.session?.user
    const userId = 3
    const project = await Project.findOne({ where: { id: projectId, userId } })
    return project ? next() : res.sendStatus(403)
  }
  catch(err){
    return next(err)
  }
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
    return next(err)
  }
}

// Upload start
const uploadStartHandler = async (req: Request, res: Response) : Promise<Response> => {
  console.log(req.path, req.params, req.query)
  try {
    const s3Key = uuid()

    const params = {
      Bucket: FILE_STORAGE_BUCKET_NAME,
      Key: s3Key,
      ContentType: req.query.mimeType,
      Expires: 180, // seconds
    }

    const presignedUrl = await s3.getSignedUrlPromise('putObject', params)
    return res.status(200).json({ presignedUrl })

  } catch (err) {
    logger.error(`${err.message}`)
    return res.status(500).json({ message: 'Unable to generate presigned URL' })
  }
}

export { verifyProjectOwner, createProject, listProjects, uploadStartHandler }