import crypto from 'crypto'
import { spawn } from 'child_process'
import { EventEmitter } from 'events'
import { parse } from 'pg-connection-string'
import { generateRdsIamAuthToken } from './utils/rds-iam'

const PGDUMP_COMMAND = 'pg_dump'

export interface EncryptionConfig {
  algorithm: string
  key: string
}

export interface DatabaseConfig {
  databaseUri: string
  useIam: boolean
  ssl: { mode: string; cert: string }
}

class EncryptedPgdump extends EventEmitter {
  host: string
  port: number

  database: string
  user: string
  password: string
  useIam: boolean

  sslMode: string
  sslCert: string

  algorithm: string
  iv: Buffer
  key: crypto.CipherKey

  constructor(dbConfig: DatabaseConfig, encryptionConfig: EncryptionConfig) {
    super()

    this.useIam = dbConfig.useIam

    const { host, port, database, user, password } = parse(dbConfig.databaseUri)
    this.host = host || 'localhost'
    this.port = port ? +port : 5432
    this.database = database || ''
    this.user = user || ''
    this.password = password || ''

    const { mode, cert } = dbConfig.ssl
    this.sslMode = mode || 'disable'
    this.sslCert = cert || ''

    const { key, algorithm } = encryptionConfig
    this.iv = crypto.randomBytes(16)
    this.algorithm = algorithm
    // TODO: Support generating a data key using KMS
    this.key = Buffer.from(key, 'hex')
  }

  private async pgdump(): Promise<NodeJS.ReadableStream> {
    const password = this.useIam
      ? await generateRdsIamAuthToken({
          username: this.user,
          hostname: this.host,
          port: this.port,
        })
      : this.password

    // Provide connection parameters as environment variables
    const env = {
      ...process.env,
      PGHOST: this.host,
      PGPORT: `${this.port}`,
      PGDATABASE: this.database,
      PGUSER: this.user,
      PGPASSWORD: password,
      PGSSLMODE: this.sslMode,
      PGSSLROOTCERT: this.sslCert,
    }

    const pgdump = spawn(PGDUMP_COMMAND, ['-Fc'], { env })

    let errorMsg = ''
    pgdump.stderr.on('data', (data) => {
      errorMsg += data.toString('utf8')
    })
    pgdump.on('exit', (code) => {
      if (code !== 0) {
        this.emit('error', new Error(errorMsg))
      }
    })
    pgdump.on('error', (err) => this.emit('error', err))

    return pgdump.stdout
  }

  private encrypt(inputStream: NodeJS.ReadableStream): NodeJS.ReadableStream {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv)
    cipher.on('error', (err) => this.emit('error', err))

    return inputStream.pipe(cipher)
  }

  async run(): Promise<NodeJS.ReadableStream> {
    const output = await this.pgdump()
    return this.encrypt(output)
  }
}

export default EncryptedPgdump
