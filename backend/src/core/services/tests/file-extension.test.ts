import { FileExtensionService } from '@core/services/file-extensions.service'

describe('file-extension', () => {
  const allowedFileExtensions = ['txt', 'xml']
  describe('hasAllowedExtensions', () => {
    test('should return true if file is valid via extension', async () => {
      const result = await FileExtensionService.hasAllowedExtensions(
        {
          data: Buffer.from('hi'),
          name: 'file.txt',
        },
        allowedFileExtensions
      )
      expect(result).toBeTruthy()
    })

    test('should return true if file is valid via detected file type', async () => {
      const result = await FileExtensionService.hasAllowedExtensions(
        {
          data: Buffer.from('<?xml version="1.0" encoding="ISO-8859-1" ?>'),
          name: 'file.fakexml',
        },
        allowedFileExtensions
      )
      expect(result).toBeTruthy()
    })

    test('should return false if file is invalid via extension', async () => {
      const result = await FileExtensionService.hasAllowedExtensions(
        {
          data: Buffer.from(''),
          name: 'file.jpg',
        },
        allowedFileExtensions
      )
      expect(result).toBeFalsy()
    })

    test('should return false if file is invalid via detected file type', async () => {
      const result = await FileExtensionService.hasAllowedExtensions(
        {
          data: Buffer.from('<?xml version="1.0" encoding="ISO-8859-1" ?>'),
          name: 'file.fakexml',
        },
        ['csv']
      )
      expect(result).toBeFalsy()
    })
  })
})
