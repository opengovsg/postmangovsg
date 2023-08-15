import { Request, Response, NextFunction } from 'express'
import fileUpload, { UploadedFile } from 'express-fileupload'
import config from '@core/config'
import { ensureAttachmentsFieldIsArray } from '@core/utils/attachment'
import { isDefaultFromAddress } from '@core/utils/from-address'
import {
  ApiAttachmentFormatError,
  ApiAttachmentLimitError,
  ApiAuthorizationError,
  ApiNotFoundError,
} from '@core/errors/rest-api.errors'
import { S3 } from '@aws-sdk/client-s3'
import { configureEndpoint } from '@core/utils/aws-endpoint'
import { CommonAttachment } from '@email/models/common-attachment'
import { v4 as uuidv4 } from 'uuid'
import { Readable } from 'stream'

const TOTAL_ATTACHMENT_SIZE_LIMIT = config.get(
  'file.maxCumulativeAttachmentsSize'
)

const s3 = new S3({ ...configureEndpoint(config) })

const getFileUploadHandler = (fileSize: number, fieldSize: number) =>
  fileUpload({
    limits: {
      fileSize,
      fieldSize,
    },
    abortOnLimit: true,
    limitHandler: function (_req: Request, _res: Response, next: NextFunction) {
      next(
        new ApiAttachmentLimitError(
          'Size of one or more attachments exceeds limit'
        )
      )
    },
  })

/**
 * Place incoming files into the request body so that it can be
 * validated together with the other fields by Joi.
 */
function preprocessPotentialIncomingFile(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.files?.attachments) {
    const { attachments } = req.files
    req.body.attachments = ensureAttachmentsFieldIsArray(attachments)
  }
  next()
}

// two checks: (1) must use custom domain for attachment; (2) global attachment size limit respected
async function checkAttachmentValidity(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.files?.attachments && req.body.attachments) {
    // this means attachments are sent via JSON, which is inconsistent with our OpenAPI spec
    throw new ApiAttachmentFormatError('Attachments must be sent via form-data')
  }
  // return early if no attachments
  if (!req.files?.attachments) {
    next()
    return
  }
  // forbid user from sending attachments from default @mail.postman.gov.sg
  const { from } = req.body
  if (isDefaultFromAddress(from)) {
    throw new ApiAuthorizationError(
      'Attachments are not allowed for Postman default from email address'
    )
  }
  // ensuring global attachment size limit is not exceeded
  const attachments = ensureAttachmentsFieldIsArray(req.files.attachments)
  const totalAttachmentsSize = attachments.reduce(
    (acc, attachment) => acc + attachment.size,
    0
  )
  if (totalAttachmentsSize > TOTAL_ATTACHMENT_SIZE_LIMIT) {
    throw new ApiAttachmentLimitError(
      'Cumulative attachment size exceeds limit'
    )
  }
  next()
}

function transformAttachmentsFieldToArray(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (req.files?.attachments) {
    req.body.attachments = ensureAttachmentsFieldIsArray(req.files.attachments)
  }
  next()
}

async function storeCampaignEmbed(
  req: Request,
  res: Response
): Promise<Response> {
  const a = req.body.attachments[0] as UploadedFile
  const hash = a.md5
  const type = a.mimetype
  const userId = req.session?.user?.id
  const commonAttachment = await CommonAttachment.create({
    id: uuidv4(),
    originalFileName: a.name,
    metadata: {
      size: a.size,
      hash,
      type,
    },
    userId,
  } as CommonAttachment)
  await s3.putObject({
    Bucket: config.get('commonAttachments.bucketName'),
    Key: commonAttachment.id,
    ContentType: type,
    Body: a.data,
  })
  return res.status(200).json({
    id: commonAttachment.id,
    original_file_name: commonAttachment.originalFileName,
    metadata: commonAttachment.metadata,
  })
}

async function streamCampaignEmbed(
  req: Request,
  res: Response
): Promise<Response> {
  const id = req.params.attachmentId
  const attachment = await CommonAttachment.findOne({
    where: { id },
  })
  if (!attachment) {
    throw new ApiNotFoundError(`Attachment with ID ${id} doesn't exist`)
  }

  const obj = await s3.getObject({
    Bucket: config.get('commonAttachments.bucketName'),
    Key: id,
  })
  res.setHeader('Content-Type', attachment.metadata.type)
  res.setHeader(
    'Content-Disposition',
    `inline; filename=${attachment.originalFileName}`
  )
  ;(obj.Body as Readable).pipe(res)
  return res
}

export const FileAttachmentMiddleware = {
  checkAttachmentValidity,
  getFileUploadHandler,
  preprocessPotentialIncomingFile,
  transformAttachmentsFieldToArray,
  storeCampaignEmbed,
  streamCampaignEmbed,
}
