import convict from 'convict'

const isDev = process.env.NODE_ENV === 'development'

const isTest = process.env.NODE_ENV === 'test'

export const config = convict({
  environment: {
    env: 'NODE_ENV',
    format: ['development', 'staging', 'uat', 'production', 'test'],
    default: 'development',
  },
  isTestOrDev: {
    default: isDev || isTest,
  },
})
  .validate()
  .getProperties()
