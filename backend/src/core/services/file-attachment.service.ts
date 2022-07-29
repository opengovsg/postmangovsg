import CloudmersiveClient from '@core/services/cloudmersive-client.class'
import config from '@core/config'
import { Promise as BluebirdPromise } from 'bluebird'
import _ from 'lodash'
import { MailAttachment } from '@shared/clients/mail-client.class'
import FileType from 'file-type'
import { MaliciousFileError, UnsupportedFileTypeError } from '@core/errors'

if (!config.get('file.cloudmersiveKey')) {
  throw new Error('fileScanner: cloudmersiveKey not found')
}

const client = new CloudmersiveClient(config.get('file.cloudmersiveKey'))

const hasAllowedType = async (file: {
  data: Buffer
  name: string
}): Promise<boolean> => {
  const { data, name } = file
  const allowedFileExtensions = config.get('file.supportedExtensions')

  const fileType = await FileType.fromBuffer(data)
  const extension = fileType?.ext || `${`${name}`.split('.').pop()}`
  return allowedFileExtensions.includes(extension)
}

const checkType = async (
  files: { data: Buffer; name: string }[]
): Promise<boolean> => {
  const isAllowed = await BluebirdPromise.map(files, (file) =>
    hasAllowedType(file)
  )
  return _.every(isAllowed)
}

const virusScan = async (
  files: { data: Buffer; name: string }[]
): Promise<boolean> => {
  const isSafe = await BluebirdPromise.map(files, (file) =>
    client.scanFile(file.data)
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
  files: { data: Buffer; name: string }[]
): Promise<MailAttachment[]> => {
  const isAcceptedType = await checkType(files)
  if (!isAcceptedType) {
    throw new UnsupportedFileTypeError()
  }
  const isSafe = await virusScan(files)
  if (!isSafe) {
    throw new MaliciousFileError()
  }
  return parseFiles(files)
}

export const FileAttachmentService = {
  sanitizeFiles,
}
