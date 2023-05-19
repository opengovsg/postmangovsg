import { Request, Response, NextFunction } from 'express'
import fileUpload from 'express-fileupload'
import config from '@core/config'
import { ensureAttachmentsFieldIsArray } from '@core/utils/attachment'
import { isDefaultFromAddress } from '@core/utils/from-address'
import {
  ApiAttachmentLimitError,
  ApiAuthorizationError,
} from '@core/errors/rest-api.errors'

const FILE_ATTACHMENT_MAX_NUM = config.get('file.maxAttachmentNum')
const FILE_ATTACHMENT_MAX_SIZE = config.get('file.maxAttachmentSize')
const TOTAL_ATTACHMENT_SIZE_LIMIT = config.get(
  'file.maxCumulativeAttachmentsSize'
)
const BODY_SIZE_LIMIT = config.get('transactionalEmail.bodySizeLimit')

const fileUploadHandler = fileUpload({
  limits: {
    // this limit is on a per-file basis, that's why subsequent check is required
    fileSize: FILE_ATTACHMENT_MAX_SIZE,
    // this is necessary as express-fileupload relies on busboy, which has a
    // default field size limit of 1MB and does not throw any error
    // by setting the limit to be 1 byte above the max, any request with
    // a field size exceeding the limit will be truncated to just above the limit
    // which will be caught by Joi validation
    fieldSize: BODY_SIZE_LIMIT + 1,
  },
  abortOnLimit: true,
  limitHandler: function (_: Request, _res: Response, _next: NextFunction) {
    throw new ApiAttachmentLimitError(
      'Size of one or more attachments exceeds limit'
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

export const FileAttachmentMiddleware = {
  checkAttachmentValidity,
  fileUploadHandler,
  preprocessPotentialIncomingFile,
}
