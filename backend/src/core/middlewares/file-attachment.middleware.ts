import { Request, Response, NextFunction } from 'express'
import fileUpload from 'express-fileupload'
import config from '@core/config'

const FILE_ATTACHMENT_MAX_NUM = config.get('file.maxAttachmentNum')
const FILE_ATTACHMENT_MAX_SIZE = config.get('file.maxAttachmentSize')

const fileUploadHandler = fileUpload({
  limits: {
    fileSize: FILE_ATTACHMENT_MAX_SIZE,
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

    if (!Array.isArray(attachments)) {
      req.body.attachments = [attachments]
    } else {
      req.body.attachments = attachments
    }
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

export const FileAttachmentMiddleware = {
  fileUploadHandler,
  preprocessPotentialIncomingFile,
}
