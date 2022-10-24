import { loggerWithLabel } from '@core/logger'
import {
  ApiClient,
  ScanApi,
  VirusScanResult,
} from 'cloudmersive-virus-api-client'

const logger = loggerWithLabel(module)

export default class CloudmersiveClient {
  private api: ScanApi
  private apiKey: string

  constructor(cloudmersiveKey: string) {
    this.apiKey = cloudmersiveKey
    const client = ApiClient.instance
    const ApiKey = client.authentications.Apikey
    ApiKey.apiKey = cloudmersiveKey
    this.api = new ScanApi()
  }

  /**
   * Scans the contents of a file,
   * @param fileBuffer
   * @throws Will throw error if Cloudmersive fails to scan file
   * @return  true if the scan contains no viruses, false otherwise
   */
  scanFile: (fileBuffer: Buffer) => Promise<boolean> = async (fileBuffer) => {
    if (!this.apiKey) {
      logger.warn({
        message: 'Cloudmersive API key not found, not scanning files',
      })
      return true
    }
    return this.isSafe(fileBuffer)
  }

  private isSafe: (fileBuffer: Buffer) => Promise<boolean> = (fileBuffer) =>
    new Promise((res) => {
      this.api.scanFile(fileBuffer, (err: any, data: VirusScanResult) => {
        if (err) {
          throw new Error(`Error when scanning file via Cloudmersive: ${err}`)
        }
        return res(data.CleanResult)
      })
    })
}
