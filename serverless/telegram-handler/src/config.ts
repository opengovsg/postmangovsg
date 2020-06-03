import convict from 'convict'
import dotenv from 'dotenv'

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
    format: 'required',
    env: 'DEV_SERVER_PORT',
  },
})

config.validate({ allowed: 'strict' })

export default config
