module.exports = {
  roots: ['<rootDir>'],
  testMatch: ['**/tests/**/*.(spec|test).+(ts|tsx|js)'],
  testPathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '@core/(.*)': '<rootDir>/src/core/$1',
    '@sms/(.*)': '<rootDir>/src/sms/$1',
    '@email/(.*)': '<rootDir>/src/email/$1',
    '@telegram/(.*)': '<rootDir>/src/telegram/$1',
    '@tests/(.*)': '<rootDir>/tests/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/test-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
}
