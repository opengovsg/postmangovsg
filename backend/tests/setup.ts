import SequelizeMock from 'sequelize-mock'

/* eslint-disable no-console */
global.console = {
  ...global.console,
  log: jest.fn(), // console.log are ignored in tests
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
}

jest.mock('redis', () => jest.requireActual('redis-mock'))

// Mock services
jest.mock('@core/services/mail-client.class')

// Mock models
const sequelizeMock = new SequelizeMock()
export const UserMock = sequelizeMock.define('users')

jest.mock('@core/models/user/user', () => ({
  User: UserMock,
}))

export const CampaignMock = sequelizeMock.define('campaigns')

jest.mock('@core/models/campaign', () => ({
  Campaign: CampaignMock,
}))
