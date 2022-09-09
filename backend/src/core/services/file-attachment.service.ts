import FileScannerClient from '@core/services/filescanner-client.class'
import config from '@core/config'
import _ from 'lodash'
import { MailAttachment } from '@shared/clients/mail-client.class'
import {
  MaliciousFileError,
  UnsupportedFileTypeError,
  UnableToScanFileError,
} from '@core/errors'
import { FileExtensionService } from '@core/services'

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
  const client = new FileScannerClient(config.get('file.scannerEndpoint'))

  const isSafe = await Promise.all(files.map((file) => client.scanFile(file)))
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
  const isAcceptedType = await checkExtensions(files)
  if (!isAcceptedType) {
    throw new UnsupportedFileTypeError()
  }
  let isSafe = false
  try {
    isSafe = await virusScan(files)
  } catch (err) {
    throw new UnableToScanFileError()
  }
  if (!isSafe) {
    throw new MaliciousFileError()
  }
  return parseFiles(files)
}

export const FileAttachmentService = {
  sanitizeFiles,
}
