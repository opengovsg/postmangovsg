module.exports = {
  roots: ['<rootDir>'],
  testMatch: ['**/tests/**/*.(spec|test).+(ts|tsx|js)'],
  testPathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/'],
  transform: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
}
