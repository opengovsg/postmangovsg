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

// The stored type is whatever the uploader's browser declared, so only media,
// PDF and plain text are rendered inline. A subtype containing `+`, such as
// image/svg+xml, can be an XML document that runs script, so it never matches.
// Anything else is downloaded so an uploaded page never runs on our origin.
const INLINE_CONTENT_TYPE =
  /^((image|audio|video)\/[a-z0-9.-]+|application\/pdf|text\/plain)$/

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

// busboy decodes a multipart filename as latin1, so a UTF-8 name such as
// 通知.txt is stored as é€šçŸ¥.txt. Recover the UTF-8 name when the stored
// bytes are valid UTF-8, and keep the name as stored otherwise.
// https://github.com/mscdex/busboy#exports
function decodeUploadedFileName(name: string): string {
  if (/[\u0100-\uffff]/.test(name)) return name
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Buffer.from(name, 'latin1')
    )
  } catch {
    return name
  }
}

async function streamCampaignEmbed(
  req: Request,
  res: Response
): Promise<Response> {
  const id = req.params.attachmentId
  const attachment = await CommonAttachment.findOne({
    where: { id },
  })
  if (!attachment || attachment.id !== id) {
    throw new ApiNotFoundError(`Attachment with ID ${id} doesn't exist`)
  }

  const obj = await s3.getObject({
    Bucket: config.get('commonAttachments.bucketName'),
    Key: id,
  })
  const isInline = INLINE_CONTENT_TYPE.test(attachment.metadata.type)
  res.setHeader(
    'Content-Type',
    isInline ? attachment.metadata.type : 'application/octet-stream'
  )
  // RFC 5987 encoding: a raw non-ASCII name makes setHeader throw
  const fileName = encodeURIComponent(
    decodeUploadedFileName(attachment.originalFileName)
  ).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  res.setHeader(
    'Content-Disposition',
    `${isInline ? 'inline' : 'attachment'}; filename*=UTF-8''${fileName}`
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
