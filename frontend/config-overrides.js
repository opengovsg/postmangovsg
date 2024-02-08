/* eslint-disable */
const {
  aliasDangerous,
  configPaths,
} = require('react-app-rewire-alias/lib/aliasDangerous')
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin')

const aliasMap = configPaths('./tsconfig.paths.json')

module.exports = (config) => {
  config.resolve.plugins = config.resolve.plugins.filter(
    (plugin) => !(plugin instanceof ModuleScopePlugin)
  )
  config.resolve.fallback = {
    stream: require.resolve('stream'),
    querystring: require.resolve('querystring'),
    url: require.resolve('url'),
    util: require.resolve('util'),
  }
  const modified = aliasDangerous(aliasMap)(config)
  return modified
}

module.exports.jest = (config) => {
  const aliasMap = {
    '^config$': '<rootDir>/src/config',
    '^test-utils/?(.*)': '<rootDir>/src/test-utils/$1',
    '^assets/?(.*)': '<rootDir>/src/assets/$1',
    '^classes/?(.*)': '<rootDir>/src/classes/$1',
    '^components/?(.*)': '<rootDir>/src/components/$1',
    '^contexts/?(.*)': '<rootDir>/src/contexts/$1',
    '^locales/?(.*)': '<rootDir>/src/locales/$1',
    '^routes/?(.*)': '<rootDir>/src/routes/$1',
    '^services/?(.*)': '<rootDir>/src/services/$1',
    '^styles/?(.*)': '<rootDir>/src/styles/$1',
    '^@shared/?(.*)': '<rootDir>/../shared/src/$1',
  }
  config.testPathIgnorePatterns.push(...[
    'frontend/src/components/dashboard/create/email/tests/EmailRecipients.test.tsx',
    'frontend/src/components/dashboard/create/sms/tests/SMSRecipients.test.tsx',
    'frontend/src/components/dashboard/create/telegram/tests/TelegramRecipients.test.tsx',
    'frontend/src/components/dashboard/tests/integration/email.test.tsx',
    'frontend/src/components/dashboard/tests/integration/sms.test.tsx',
    'frontend/src/components/dashboard/tests/integration/telegram.test.tsx',
  ])
  
  const moduleNameMapper = { ...config.moduleNameMapper, ...aliasMap }
  return {
    ...config,
    setupFilesAfterEnv: ['./src/setupTests.ts'],
    moduleNameMapper,
  }
}
