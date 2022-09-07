import convict from 'convict'

export const config = convict({
  environment: {
    env: 'NODE_ENV',
    format: ['development', 'staging', 'uat', 'production', 'test'],
    default: 'development',
  },
})
  .validate()
  .getProperties()
