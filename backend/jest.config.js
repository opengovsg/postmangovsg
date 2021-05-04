module.exports = {
  roots: ['<rootDir>'],
  testMatch: ['**/tests/**/*.(spec|test).+(ts|tsx|js)'],
  testPathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '@core/(.*)': '<rootDir>/src/core/$1',
    '@sms/(.*)': '<rootDir>/src/sms/$1',
    '@email/(.*)': '<rootDir>/src/email/$1',
    '@telegram/(.*)': '<rootDir>/src/telegram/$1',
    '@test-utils/(.*)': '<rootDir>/src/test-utils/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/src/test-utils/global-setup.ts',
  globalTeardown: '<rootDir>/src/test-utils/global-teardown.ts',
  setupFiles: ['<rootDir>/src/test-utils/test-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
}
