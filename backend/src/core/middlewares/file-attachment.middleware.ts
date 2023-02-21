import { Request, Response, NextFunction } from 'express'
import fileUpload from 'express-fileupload'
import config from '@core/config'
import { ensureAttachmentsFieldIsArray } from '@core/utils/attachment'
import { isDefaultFromAddress } from '@core/utils/from-address'

const FILE_ATTACHMENT_MAX_NUM = config.get('file.maxAttachmentNum')
const FILE_ATTACHMENT_MAX_SIZE = config.get('file.maxAttachmentSize')
const BODY_SIZE_LIMIT = config.get('transactionalEmail.bodySizeLimit')

const fileUploadHandler = fileUpload({
  limits: {
    fileSize: FILE_ATTACHMENT_MAX_SIZE,
    // this is necessary as express-fileupload relies on busboy, which has a
    // default field size limit of 1MB and does not throw any error
    // by setting the limit to be 1 byte above the max, any request with
    // a field size exceeding the limit will be truncated to just above the limit
    // which will be caught by Joi validation
    fieldSize: BODY_SIZE_LIMIT + 1,
  },
  abortOnLimit: true,
  limitHandler: function (_: Request, res: Response) {
    res.status(413).json({ message: 'Size of attachments exceeds limit' })
  },
})

/**
 * Place incoming files into the request body so that it can be
 * validated together with the other fields by Joi.
 */
function preprocessPotentialIncomingFile(
  req: Request,
  res: Response,
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
      res.status(413).json({ message: 'Number of attachments exceeds limit' })
      return
    }
  }
  next()
}

// forbid user from sending attachments from default from address to minimize risk
async function checkAttachmentPermission(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { from } = req.body
  if (req.files?.attachments && isDefaultFromAddress(from)) {
    res.status(403).json({
      message:
        'Attachments are not allowed for Postman default from email address',
    })
    return
  }
  next()
}

export const FileAttachmentMiddleware = {
  checkAttachmentPermission,
  fileUploadHandler,
  preprocessPotentialIncomingFile,
}
