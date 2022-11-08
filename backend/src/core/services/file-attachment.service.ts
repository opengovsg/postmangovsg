import CloudmersiveClient from '@core/services/cloudmersive-client.class'
import config from '@core/config'
import _ from 'lodash'
import { MailAttachment } from '@shared/clients/mail-client.class'
import { MaliciousFileError, UnsupportedFileTypeError } from '@core/errors'
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

const areFilesSafe = async (
  files: { data: Buffer; name: string }[]
): Promise<boolean> => {
  const client = new CloudmersiveClient(config.get('file.cloudmersiveKey'))

  const isSafe = await Promise.all(
    files.map((file) => client.scanFile(file.data))
  )
  return _.every(isSafe)
}

const parseFiles = async (
  files: { data: Buffer; name: string }[]
): Promise<MailAttachment[]> => {
  const parsedFiles = files.map(({ data, name }) => {
    return { filename: name, content: data }
  })
  return parsedFiles
}

export const UNSUPPORTED_FILE_TYPE_ERROR_CODE =
  'Error 400: Unsupported file type'

export const MALICIOUS_FILE_ERROR_CODE = 'Error 400: Malicious file'

const sanitizeFiles = async (
  files: { data: Buffer; name: string }[],
  emailMessageTransactionalId: number
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
  const filesSafe = await areFilesSafe(files)
  if (!filesSafe) {
    await EmailMessageTransactional.update(
      {
        errorCode: MALICIOUS_FILE_ERROR_CODE,
      },
      {
        where: { id: emailMessageTransactionalId },
      }
    )
    throw new MaliciousFileError()
  }
  return parseFiles(files)
}

export const FileAttachmentService = {
  sanitizeFiles,
}
