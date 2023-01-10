import { UploadedFile } from 'express-fileupload'

const ensureAttachmentsFieldIsArray = (
  attachments: UploadedFile | UploadedFile[]
) => {
  if (!Array.isArray(attachments)) {
    return [attachments]
  }
  return attachments
}

export { ensureAttachmentsFieldIsArray }
