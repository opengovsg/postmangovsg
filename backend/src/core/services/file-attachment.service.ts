import { MailAttachment } from '@shared/clients/mail-client.class'

const checkType = (files: { data: Buffer; name: string }[]): boolean => {
  if (files) return true
  return false
}

const virusScan = async (
  files: { data: Buffer; name: string }[]
): Promise<boolean> => {
  if (files) return true
  return false
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
