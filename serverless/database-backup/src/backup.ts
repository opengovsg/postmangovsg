import { Readable } from 'stream'
import path from 'path'

import config from './config'
import Encryptor from './encryptor'
import { PgDump, SecretsManagerDump } from './dumps'
import { getStorage } from './utils/gcs'

class Backup {
  pgDump: PgDump
  secretsDump: SecretsManagerDump
  encryptor: Encryptor

  constructor(options: {
    pgDump: PgDump
    secretsDump: SecretsManagerDump
    encryptor: Encryptor
  }) {
    const { pgDump, secretsDump, encryptor } = options
    this.pgDump = pgDump
    this.encryptor = encryptor
    this.secretsDump = secretsDump
  }

  private async createGcsUploadStream(
    location: string
  ): Promise<NodeJS.WritableStream> {
    const storage = await getStorage()

    const bucket = storage.bucket(config.get('gcp.backupBucket'))
    const file = bucket.file(location)
    return file.createWriteStream({ gzip: 'auto', validation: true })
  }

  private async uploadPgDump(
    folder: string
  ): Promise<{ filename: string; authTag: string | undefined }> {
    const { database } = this.pgDump

    const data = await this.pgDump.run()
    const filepath = `${database}.dump`
    const upload = await this.createGcsUploadStream(path.join(folder, filepath))

    await new Promise((resolve, reject) => {
      this.pgDump.on('error', (err: Error) => reject(err))
      this.encryptor.on('error', (err: Error) => reject(err))

      this.encryptor
        .encrypt(data)
        .pipe(upload)
        .on('finish', () => resolve())
        .on('error', (err: Error) => reject(err))
    })

    const authTag = this.encryptor.authTag
    return {
      filename: filepath,
      authTag: authTag?.toString('base64'),
    }
  }

  private async uploadSecretsDump(
    folder: string
  ): Promise<{ filename: string; authTag: string | undefined }> {
    const data = await this.secretsDump.run()
    const filepath = 'secrets.dump'
    const upload = await this.createGcsUploadStream(path.join(folder, filepath))

    await new Promise((resolve, reject) => {
      this.encryptor.on('error', (err: Error) => reject(err))

      this.encryptor
        .encrypt(data)
        .pipe(upload)
        .on('finish', () => resolve())
        .on('error', (err: Error) => reject(err))
    })

    const authTag = this.encryptor.authTag
    return {
      filename: filepath,
      authTag: authTag?.toString('base64'),
    }
  }

  private async uploadEncryptionParams(
    folder: string,
    params: any
  ): Promise<void> {
    const { database } = this.pgDump

    const filepath = path.join(folder, `${database}.json`)
    const upload = await this.createGcsUploadStream(filepath)

    await new Promise((resolve, reject) => {
      const inputStream = Readable.from(JSON.stringify(params))

      inputStream
        .pipe(upload)
        .on('finish', () => resolve())
        .on('error', (err: Error) => reject(err))
    })
  }

  async upload(): Promise<string> {
    const bucket = config.get('gcp.backupBucket')
    // Backup folder follows the following format: YYYY-MM-DD_HH-mm-ss
    const folder = new Date()
      .toISOString()
      .substring(0, 19)
      .replace(/:/g, '-')
      .replace('T', '_')

    const dumpParams = []

    const pgDumpParams = await this.uploadPgDump(folder)
    dumpParams.push(pgDumpParams)

    const secretsDumpParams = await this.uploadSecretsDump(folder)
    dumpParams.push(secretsDumpParams)

    const encryptionParams = this.encryptor.getEncryptionParams()
    const backupParams = {
      encryption: encryptionParams,
      dumps: dumpParams,
    }
    await this.uploadEncryptionParams(folder, backupParams)

    return `gcs://${bucket}/${folder}/`
  }
}

export default Backup
