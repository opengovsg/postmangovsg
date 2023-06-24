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

const parseFiles = async (
  files: { data: Buffer; name: string }[]
): Promise<MailAttachment[]> => {
  return files.map(({ data, name }, index) => {
    // include cid field to support content-id images; see PR #1905
    return { filename: name, content: data, cid: index.toString() }
  })
}

export const UNSUPPORTED_FILE_TYPE_ERROR_CODE =
  'Error 400: Unsupported file type'

const sanitizeFiles = async (
  files: { data: Buffer; name: string }[],
  emailMessageTransactionalId: string
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
  return parseFiles(files)
}

export const FileAttachmentService = {
  sanitizeFiles,
}
