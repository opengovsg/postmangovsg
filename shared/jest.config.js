module.exports = {
  roots: ['<rootDir>'],
  testMatch: ['**/tests/**/*.(spec|test).+(ts|tsx|js)'],
  testPathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '@shared/core/models/(.*)': '<rootDir>/src/core/models/$1',
    '@shared/core/interfaces/(.*)': '<rootDir>/src/core/interfaces/$1',
    '@core/(.*)': '<rootDir>/src/core/$1',
  },
  transform: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
}
