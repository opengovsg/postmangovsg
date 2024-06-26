import { UploadedFile } from 'express-fileupload'

export const ensureAttachmentsFieldIsArray = (
  attachments: UploadedFile | UploadedFile[]
) => {
  if (!Array.isArray(attachments)) {
    return [attachments]
  }
  return attachments
}

export const removeFirstAndLastCharacter = (str: string) => {
  return str.slice(1, -1)
}
