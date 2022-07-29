import CloudmersiveClient from '@core/services/cloudmersive-client.class'
import config from '@core/config'
import { Promise as BluebirdPromise } from 'bluebird'
import _ from 'lodash'
import { MailAttachment } from '@shared/clients/mail-client.class'

if (!config.get('file.cloudmersiveKey')) {
  throw new Error('fileScanner: cloudmersiveKey not found')
}

const client = new CloudmersiveClient(config.get('file.cloudmersiveKey'))

const checkType = (files: { data: Buffer; name: string }[]): boolean => {
  if (files) return true
  return false
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
): Promise<MailAttachment[] | undefined> => {
  const isAcceptedType = checkType(files)
  const isSafe = await virusScan(files)
  if (isAcceptedType && isSafe) {
    return parseFiles(files)
  }
  return undefined
}

export const FileAttachmentService = {
  sanitizeFiles,
}
