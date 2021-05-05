/* eslint-disable */
const fs = require('fs')
const {
  aliasDangerous,
  configPaths,
} = require('react-app-rewire-alias/lib/aliasDangerous')

const aliasMap = configPaths('./tsconfig.paths.json')

module.exports = (config) => {
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
  const moduleNameMapper = { ...config.moduleNameMapper, ...aliasMap }
  return { ...config, moduleNameMapper }
}
