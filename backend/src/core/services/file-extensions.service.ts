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
  const { data, name } = file

  const fileType = await FileType.fromBuffer(data)
  const extension = fileType?.ext || `${`${name}`.split('.').pop()}`
  return allowedFileExtensions.includes(extension)
}

export const FileExtensionService = {
  hasAllowedExtensions,
}
