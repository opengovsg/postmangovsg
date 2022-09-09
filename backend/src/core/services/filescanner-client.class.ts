import { loggerWithLabel } from '@core/logger'
import axios from 'axios'
import FormData from 'form-data'

const logger = loggerWithLabel(module)

type ScannedFile = {
  data: Buffer
  name: string
}

type FileScanResult = {
  isMalicious: boolean
}

export default class FileScannerClient {
  private endpoint: string

  constructor(endpoint: string) {
    this.endpoint = endpoint
  }

  /**
   * Scans the contents of a file,
   * @param blob
   * @throws Will throw error if filescanner fails to scan file
   * @return  true if the scan contains no viruses, false otherwise
   */
  scanFile: ({ data, name }: ScannedFile) => Promise<boolean> = async (
    fileBuffer
  ) => {
    if (!this.endpoint) {
      logger.warn({
        message: 'File scan endpoint not found, not scanning files',
      })
      return true
    }
    return this.isSafe(fileBuffer)
  }

  private isSafe: ({ data, name }: ScannedFile) => Promise<boolean> = async ({
    data,
    name,
  }) => {
    logger.info({ message: `scanning ${name} via ${this.endpoint}` })
    const form = new FormData()
    form.append('file', data)
    const { data: virusResult } = await axios.post<FileScanResult>(
      this.endpoint,
      form.getBuffer(),
      {
        headers: {
          ...form.getHeaders(),
        },
      }
    )
    const isSafe = !virusResult.isMalicious
    logger.info({ message: `${name} is safe: ${isSafe}` })
    return isSafe
  }
}
