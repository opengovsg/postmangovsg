import SequelizeMock from 'sequelize-mock'

// Mock models
const sequelizeMock = new SequelizeMock()
const userModelMock = sequelizeMock.define('user')

jest.mock('@core/models/user/user', () => ({
  User: userModelMock,
}))

export { userModelMock }
