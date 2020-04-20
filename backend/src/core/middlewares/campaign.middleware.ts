import S3 from 'aws-sdk/clients/s3'
import { Request, Response, NextFunction } from 'express'
import { Campaign, JobQueue } from '@core/models'
import { Op, literal } from 'sequelize'
import { v4 as uuid } from 'uuid'

import config from '@core/config'
import logger from '@core/logger'
import { jwtUtils } from '@core/utils/jwt'
import { JobStatus } from '@core/constants'

const AWS_REGION = config.aws.awsRegion
const FILE_STORAGE_BUCKET_NAME = config.aws.uploadBucket

const s3 = new S3({
  signatureVersion: 'v4',
  region: AWS_REGION,
})

/**
 *  If a campaign already has an existing running job in the job queue, then it cannot be modified.
 * @param req
 * @param res
 * @param next
 */
const canEditCampaign =  async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    const job = await JobQueue.findOne({ where: { campaignId, status: { [Op.not]: JobStatus.Logged } } })
    return !job ? next() : res.sendStatus(403)
  }
  catch(err){
    return next(err)
  }
}

// Create campaign
const createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { name, type }: { name: string; type: string} = req.body
    const { id: userId } = req.session?.user
    await Campaign.create({ name, type, userId, valid: false })
    return res.sendStatus(201)
  }
  catch(err){
    return next(err)
  }

}

// List campaigns
const listCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { offset, limit } = req.query
    const { id : userId } = req.session?.user
    const options: { where: any; attributes: any; order: any; offset?: number; limit? : number} = {
      where: {
        userId,
      },
      attributes: [
        'id', 'name', 'type', 'created_at', 'valid', [literal('CASE WHEN "cred_name" IS NULL THEN False ELSE True END'), 'has_credential'],
      ],
      order: [
        ['created_at', 'DESC'],
      ],
    }
    if (offset) {
      options.offset = +offset
    }
    if(limit){
      options.limit = +limit
    }

    const campaigns = await Campaign.findAll(options)
    return res.json(campaigns)
  }catch(err){
    return next(err)
  }
}

// Upload start
const uploadStartHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const s3Key = uuid()

    const params = {
      Bucket: FILE_STORAGE_BUCKET_NAME,
      Key: s3Key,
      ContentType: req.query.mimeType,
      Expires: 180, // seconds
    }

    const signedKey = jwtUtils.sign(s3Key)

    const presignedUrl = await s3.getSignedUrlPromise('putObject', params)
    return res.status(200).json({ presignedUrl, transactionId: signedKey })

  } catch (err) {
    logger.error(`${err.message}`)
    return res.status(500).json({ message: 'Unable to generate presigned URL' })
  }
}

export { canEditCampaign, createCampaign, listCampaigns, uploadStartHandler }
