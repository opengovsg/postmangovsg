import crypto from 'crypto'
import { spawn } from 'child_process'
import { EventEmitter } from 'events'
import { parse } from 'pg-connection-string'

import config from './config'
import { generateRdsIamAuthToken } from './utils/rds-iam'
import { EncryptionConfig, DatabaseConfig } from './interfaces'

// Provide absolute path when running in lambda
const PGDUMP_COMMAND =
  config.get('env') === 'development'
    ? 'pg_dump'
    : `${process.env.LAMBDA_TASK_ROOT}/bin/pg_dump`

// We do not include owners and privileges to avoid dumping RDS specific roles (rds_iam, rds_superuser) as there might be incompatibilities
// with the restoration target.
const PGDUMP_ARGS = ['-Fc', '--no-owner', '--no-privileges']

class EncryptedPgdump extends EventEmitter {
  host: string
  port: number

  database: string
  user: string
  password: string
  useIam: boolean

  sslMode: string
  sslCert: string

  algorithm: crypto.CipherGCMTypes
  iv: Buffer
  key: crypto.KeyObject
  authTag?: Buffer

  keyEncryptionPublicKey: crypto.KeyObject
  encryptedKey: Buffer

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

    const { keySize, algorithm, keyEncryptionPublicKey } = encryptionConfig

    this.iv = crypto.randomBytes(16)
    this.algorithm = algorithm
    this.key = crypto.createSecretKey(crypto.randomBytes(keySize))

    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${keyEncryptionPublicKey}\n-----END PUBLIC KEY-----\n`
    this.keyEncryptionPublicKey = crypto.createPublicKey(publicKeyPem)
    this.encryptedKey = crypto.publicEncrypt(
      {
        key: this.keyEncryptionPublicKey,
        oaepHash: 'sha256',
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      this.key.export()
    )
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

    const pgdump = spawn(PGDUMP_COMMAND, PGDUMP_ARGS, { env })

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
    cipher.on('end', () => {
      this.authTag = cipher.getAuthTag()
    })

    return inputStream.pipe(cipher)
  }

  async run(): Promise<NodeJS.ReadableStream> {
    const output = await this.pgdump()
    return this.encrypt(output)
  }
}

export default EncryptedPgdump
