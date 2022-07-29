import { Request, Response, NextFunction } from 'express'
import fileUpload from 'express-fileupload'
import config from '@core/config'

const fileUploadHandler = fileUpload({
  limits: {
    fileSize: config.get('file.maxAttachmentSize'), // 5MB
    files: config.get('file.maxAttachmentNum'), // 10
  },
})

/**
 * Place incoming files into the request body so that it can be
 * validated together with the other fields by Joi.
 */
function preprocessPotentialIncomingFile(
  req: Request,
  _: Response,
  next: NextFunction
) {
  if (req.files && req.files.attachments) {
    const { attachments } = req.files

    if (!Array.isArray(attachments)) {
      req.body.attachments = [attachments]
    } else {
      req.body.attachments = attachments
    }
  }
  next()
}

export const FileAttachmentMiddleware = {
  fileUploadHandler,
  preprocessPotentialIncomingFile,
}
