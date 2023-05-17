// Defining these in global scope so tests can mock their implementation
const getSecretValue = jest.fn()
const createSecret = jest.fn()
const putSecretValue = jest.fn()

const mockSecretsManager = {
  getSecretValue,
  createSecret,
  putSecretValue,
}

export const SecretsManager = function (): Record<string, unknown> {
  return mockSecretsManager
}

export { mockSecretsManager }
