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

const virusScan = async (
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

const sanitizeFiles = async (
  files: { data: Buffer; name: string }[],
  emailMessageTransactionalId: number
): Promise<MailAttachment[]> => {
  const isAcceptedType = await checkExtensions(files)
  if (!isAcceptedType) {
    await EmailMessageTransactional.update(
      {
        errorCode: 'Error 400: Unsupported file type',
      },
      {
        where: { id: emailMessageTransactionalId },
      }
    )
    throw new UnsupportedFileTypeError()
  }
  const isSafe = await virusScan(files)
  if (!isSafe) {
    await EmailMessageTransactional.update(
      {
        errorCode: 'Error 400: Malicious file',
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
