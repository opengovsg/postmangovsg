module.exports = {
  'roots': [
    '<rootDir>'
  ],
  'testMatch': [
    '**/__tests__/**/*.(spec|test).+(ts|tsx|js)',
  ],
  'moduleNameMapper': {
    '@core/(.*)': '<rootDir>/src/core/$1',
    '@sms/(.*)': '<rootDir>/src/sms/$1',
    '@email/(.*)': '<rootDir>/src/email/$1'
  },
  'transform': {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  'testEnvironment': 'node',
  'setupFilesAfterEnv': ['<rootDir>/__tests__/setup.js'],
} 
