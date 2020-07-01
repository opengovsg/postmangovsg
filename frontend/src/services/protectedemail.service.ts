export interface CsvStatus {
  csvFilename?: string
  csvError?: string
  numRecipients?: number
  preview?: string
}

export async function extractTemplateParams(
  template: string
): Promise<Array<string>> {
  return Promise.resolve(['recipient', 'password', 'secretmsg'])
}

export async function validateCsv(
  file: File,
  params: Array<string>
): Promise<CsvStatus> {
  // check for errors
  // check for existense of params
  return Promise.resolve({
    csvError: '',
    numRecipients: 123,
    preview: 'This is a preview of message B',
    csvFilename: file.name,
  })
}

export async function encryptCsv(file: File): Promise<File> {
  return Promise.resolve(file)
}
