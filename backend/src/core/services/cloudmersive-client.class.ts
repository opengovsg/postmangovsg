import {
  ScanApi,
  ApiClient,
  VirusScanResult,
} from 'cloudmersive-virus-api-client'

export default class CloudmersiveClient {
  private api: ScanApi

  constructor(cloudmersiveKey: string) {
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
  scanFile: (fileBuffer: Buffer) => Promise<boolean> = (fileBuffer) =>
    new Promise((res) => {
      this.api.scanFile(fileBuffer, (err: any, data: VirusScanResult) => {
        if (err) {
          throw new Error(`Error when scanning file via Cloudmersive: ${err}`)
        }
        return res(data.CleanResult)
      })
    })
}
