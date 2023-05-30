import crypto from 'crypto'
import { UploadedFile } from 'express-fileupload'

export interface Attachment {
  data: Buffer
  name: string
  size: number
  mimetype: string
  md5: string
}

export const ensureAttachmentsFieldIsArray = (
  attachments: UploadedFile | UploadedFile[]
) => {
  if (!Array.isArray(attachments)) {
    return [attachments]
  }
  return attachments
}

export const getAttachmentHash = (content: Buffer): string => {
  const hash = crypto.createHash('md5')
  return hash.update(content).digest('hex')
}
