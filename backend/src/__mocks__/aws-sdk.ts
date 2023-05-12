// Defining these in global scope so tests can mock their implementation
const getSecretValuePromise = jest.fn()
const createSecretPromise = jest.fn()
const putSecretValuePromise = jest.fn()

const mockSecretsManager = {
  getSecretValue: jest.fn(() => ({
    promise: getSecretValuePromise,
  })),
  createSecret: jest.fn(() => ({
    promise: createSecretPromise,
  })),
  putSecretValue: jest.fn(() => ({
    promise: putSecretValuePromise,
  })),
}

const MockAWS = {
  SecretsManager: function (): Record<string, unknown> {
    return mockSecretsManager
  },
}

export { mockSecretsManager }
export default MockAWS
