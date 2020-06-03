import convict from 'convict'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

const rdsCa = fs.readFileSync(path.join(__dirname, './assets/db-ca.pem'))

dotenv.config()

convict.addFormat({
  name: 'required',
  validate: (val: string | number) => {
    if (!val) {
      throw new Error('Required value cannot be empty')
    }
  },
})

const config = convict({
  devServerPort: {
    doc: 'Port for development server to listen on',
    default: 8000,
    format: 'int',
    env: 'DEV_SERVER_PORT',
  },
  env: {
    doc: 'The application environment',
    format: ['production', 'staging', 'development'],
    default: 'production',
    env: 'NODE_ENV',
  },
  database: {
    databaseUri: {
      doc: 'URI to the postgres database',
      default: '',
      env: 'DB_URI',
      format: 'required',
      sensitive: true,
    },
    dialectOptions: {
      ssl: {
        require: {
          doc: 'Require SSL connection to database',
          default: true,
          env: 'DB_REQUIRE_SSL',
        },
        rejectUnauthorized: true,
        ca: {
          doc: 'SSL cert to connect to database',
          default: [rdsCa],
          format: '*',
          sensitive: true,
        },
      },
    },
    poolOptions: {
      max: {
        doc: 'Maximum number of connection in pool',
        default: 150,
        env: 'SEQUELIZE_POOL_MAX_CONNECTIONS',
        format: 'int',
      },
      min: {
        doc: 'Minimum number of connection in pool',
        default: 0,
        env: 'SEQUELIZE_POOL_MIN_CONNECTIONS',
        format: 'int',
      },
      acquire: {
        doc:
          'Number of milliseconds to try getting a connection from the pool before throwing error',
        default: 600000,
        env: 'SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS',
        format: 'int',
      },
      connectionTimeoutMillis: {
        doc:
          'Number of milliseconds to wait before timing out when connecting a new client',
        default: 30000,
        env: 'SEQUELIZE_POOL_CONNECTION_TIMEOUT',
        format: 'int',
      },
    },
  },
})

// Only development is a non-production environment
// Override with local config
if (config.get('env') === 'development') {
  config.load({
    database: {
      dialectOptions: {
        ssl: {
          require: false, // No ssl connection needed
          rejectUnauthorized: true,
          ca: false,
        },
      },
    },
  })
}

config.validate({ allowed: 'strict' })

export default config
