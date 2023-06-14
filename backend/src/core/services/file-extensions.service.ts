import FileType from 'file-type'

const DEFAULT_ALLOWED_EXTENSIONS = [
  'asc',
  'avi',
  'bmp',
  'csv',
  'dgn',
  'docx',
  'dwf',
  'dwg',
  'dxf',
  'ent',
  'gif',
  'jpeg',
  'jpg',
  'mpeg',
  'mpg',
  'mpp',
  'odb',
  'odf',
  'odg',
  'ods',
  'pdf',
  'png',
  'pptx',
  'rtf',
  'sxc',
  'sxd',
  'sxi',
  'sxw',
  'tif',
  'tiff',
  'txt',
  'wmv',
  'xlsx',
]

const hasAllowedExtensions = async (
  file: {
    data: Buffer
    name: string
  },
  allowedFileExtensions = DEFAULT_ALLOWED_EXTENSIONS
): Promise<boolean> => {
  const extension = await extractFileExtension(file)
  return allowedFileExtensions.includes(extension)
}

const extractFileExtension = async ({
  data,
  name,
}: {
  data: Buffer
  name: string
}): Promise<string> => {
  const fileType = await FileType.fromBuffer(data)
  return fileType?.ext || `${`${name}`.split('.').pop()}`
}

export const FileExtensionService = {
  hasAllowedExtensions,
  extractFileExtension,
}
