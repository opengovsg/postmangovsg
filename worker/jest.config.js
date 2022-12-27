module.exports = {
  roots: ['<rootDir>'],
  testMatch: ['**/tests/**/*.(spec|test).+(ts|tsx|js)'],
  testPathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '@core/(.*)': '<rootDir>/src/core/$1',
    '@shared/(.*)': '<rootDir>/../shared/src/$1',
  },
  transform: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
}
