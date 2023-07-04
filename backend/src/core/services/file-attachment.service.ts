import _ from 'lodash'
import { MailAttachment } from '@shared/clients/mail-client.class'
import { UnsupportedFileTypeError } from '@core/errors'
import { FileExtensionService } from '@core/services'
import { EmailMessageTransactional } from '@email/models'

const checkExtensions = async (
  files: { data: Buffer; name: string }[]
): Promise<boolean> => {
  const isAllowed = await Promise.all(
    files.map((file) => FileExtensionService.hasAllowedExtensions(file))
  )
  return _.every(isAllowed)
}

const parseFilesAsMailAttachments = async (
  files: { data: Buffer; name: string }[],
  bodyContainsCidTags: boolean
): Promise<MailAttachment[]> => {
  return files.map(({ data, name }, index) => {
    // include cid field to support content-id images; see PR #1905
    return bodyContainsCidTags
      ? { filename: name, content: data, cid: index.toString() }
      : { filename: name, content: data }
  })
}

export const UNSUPPORTED_FILE_TYPE_ERROR_CODE =
  'Error 400: Unsupported file type'

const sanitizeFiles = async (
  files: { data: Buffer; name: string }[],
  emailMessageTransactionalId: string,
  bodyContainsCidTags: boolean
): Promise<MailAttachment[]> => {
  const isAcceptedType = await checkExtensions(files)
  if (!isAcceptedType) {
    await EmailMessageTransactional.update(
      {
        errorCode: UNSUPPORTED_FILE_TYPE_ERROR_CODE,
      },
      {
        where: { id: emailMessageTransactionalId },
      }
    )
    throw new UnsupportedFileTypeError()
  }
  return parseFilesAsMailAttachments(files, bodyContainsCidTags)
}

export const FileAttachmentService = {
  sanitizeFiles,
}
