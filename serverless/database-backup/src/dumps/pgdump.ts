import { spawn } from 'child_process'
import { EventEmitter } from 'events'
import { parse } from 'pg-connection-string'

import config from '../config'
import { generateRdsIamAuthToken } from '../utils/rds-iam'
import { DatabaseConfig } from '../interfaces'

// Provide absolute path when running in lambda
const PGDUMP_COMMAND =
  config.get('env') === 'development'
    ? 'pg_dump'
    : `${process.env.LAMBDA_TASK_ROOT}/bin/pg_dump`

// We do not include privileges to avoid dumping RDS specific roles (rds_iam, rds_superuser) as there might be incompatibilities
// with the restoration target.
const PGDUMP_ARGS = ['-Fc', '--no-privileges']

class PgDump extends EventEmitter {
  host: string
  port: number

  database: string
  user: string
  password: string
  useIam: boolean

  sslMode: string
  sslCert: string

  constructor(dbConfig: DatabaseConfig) {
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
  }

  async run(): Promise<NodeJS.ReadableStream> {
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
}

export default PgDump
