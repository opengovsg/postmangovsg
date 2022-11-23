module.exports = {
  roots: ['<rootDir>'],
  // testMatch: ['**/tests/**/*.(spec|test).+(ts|tsx|js)'],
  testMatch: ['**/tests/**/sms-campaign.routes.(spec|test).+(ts|tsx|js)'],
  testPathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '@core/(.*)': '<rootDir>/src/core/$1',
    '@sms/(.*)': '<rootDir>/src/sms/$1',
    '@email/(.*)': '<rootDir>/src/email/$1',
    '@telegram/(.*)': '<rootDir>/src/telegram/$1',
    '@test-utils/(.*)': '<rootDir>/src/test-utils/$1',
    '@shared/(.*)': '<rootDir>/../shared/src/$1',
    // had to do this as we need to use the exact same installation of sequelize-ts
    // https://github.com/sequelize/sequelize-typescript/issues/729
    'sequelize-typescript':
      '<rootDir>/../shared/node_modules/sequelize-typescript',
    '@mocks/(.*)': '<rootDir>/src/__mocks__/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/build'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/src/test-utils/global-setup.ts',
  globalTeardown: '<rootDir>/src/test-utils/global-teardown.ts',
  setupFiles: ['<rootDir>/src/test-utils/test-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
}
