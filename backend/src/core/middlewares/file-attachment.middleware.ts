import { Request, Response, NextFunction } from 'express'
import fileUpload from 'express-fileupload'
import config from '@core/config'
import {
  Attachment,
  ensureAttachmentsFieldIsArray,
} from '@core/utils/attachment'
import { isDefaultFromAddress } from '@core/utils/from-address'
import {
  ApiAttachmentLimitError,
  ApiAuthorizationError,
} from '@core/errors/rest-api.errors'
import { S3 } from '@aws-sdk/client-s3'
import { configureEndpoint } from '@core/utils/aws-endpoint'
import { CommonAttachment } from '@email/models/common-attachment'
import { v4 as uuidv4 } from 'uuid'

const FILE_ATTACHMENT_MAX_NUM = config.get('file.maxAttachmentNum')
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
    /**
     * Throw explicit error for exceeding num files.
     * express-fileupload does not throw error if num files
     * exceeded, instead truncates array to specified num
     */
    if (req.body.attachments.length > FILE_ATTACHMENT_MAX_NUM) {
      throw new ApiAttachmentLimitError(
        `Number of attachments exceeds limit of ${FILE_ATTACHMENT_MAX_NUM}`
      )
    }
  }
  next()
}

// two checks: (1) must use custom domain for attachment; (2) global attachment size limit respected
async function checkAttachmentValidity(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
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
  const a = req.body.attachments[0] as Attachment
  const hash = a.md5
  const type = a.mimetype
  const commonAttachment = await CommonAttachment.create({
    id: uuidv4(),
    originalFileName: a.name,
    metadata: {
      size: a.size,
      hash,
      type,
    },
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

export const FileAttachmentMiddleware = {
  checkAttachmentValidity,
  getFileUploadHandler,
  preprocessPotentialIncomingFile,
  transformAttachmentsFieldToArray,
  storeCampaignEmbed,
}
