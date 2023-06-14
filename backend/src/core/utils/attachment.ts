import { UploadedFile } from 'express-fileupload'

export const ensureAttachmentsFieldIsArray = (
  attachments: UploadedFile | UploadedFile[]
) => {
  if (!Array.isArray(attachments)) {
    return [attachments]
  }
  return attachments
}
