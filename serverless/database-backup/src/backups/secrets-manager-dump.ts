import { Readable } from 'stream'
import fs from 'fs'
import AWS from 'aws-sdk'
import { Client, ClientConfig } from 'pg'
import { parse } from 'pg-connection-string'

import { generateRdsIamAuthToken } from '../utils/rds-iam'
import { DatabaseConfig } from '../interfaces'
import { configureEndpoint } from '../utils/aws-endpoint'
import config from '../config'

const secretsManager = new AWS.SecretsManager(configureEndpoint(config))

class SecretsManagerDump {
  host: string
  port: number

  database: string
  user: string
  password: string
  useIam: boolean

  sslMode: string
  sslCert: string

  client?: Client

  constructor(dbConfig: DatabaseConfig) {
    this.useIam = dbConfig.useIam

    const { host, port, database, user, password } = parse(dbConfig.databaseUri)
    this.host = host || 'localhost'
    this.port = port ? +port : 5432
    this.database = database || ''
    this.user = user || ''
    this.password = password || ''

    const { mode, cert } = dbConfig.ssl
    this.sslMode = mode || 'disable'
    this.sslCert = cert ? fs.readFileSync(cert, 'ascii') : ''
  }

  private async getClient() {
    if (!this.client) {
      const password = this.useIam
        ? await generateRdsIamAuthToken({
            username: this.user,
            hostname: this.host,
            port: this.port,
          })
        : this.password

      const config: ClientConfig = {
        host: this.host,
        port: this.port,
        database: this.database,
        user: this.user,
        password,
        ...(this.sslMode !== 'disable' ? { ca: [this.sslCert] } : {}),
      }

      this.client = new Client(config)
      await this.client.connect()
    }

    return this.client
  }

  async run(): Promise<NodeJS.ReadableStream> {
    const client = await this.getClient()
    const res = await client.query('SELECT * FROM credentials')

    const secrets = []
    for (const row of res.rows) {
      try {
        const secret = await secretsManager
          .getSecretValue({ SecretId: row.name })
          .promise()
        secrets.push(secret)
      } catch (err) {
        if (err.name === 'ResourceNotFoundException') {
          console.warn(`Warning: Unable to find secret ${row.name}`)
        } else {
          throw err
        }
      }
    }

    const outputStream = Readable.from(JSON.stringify({ secrets }))
    return outputStream
  }
}

export default SecretsManagerDump
