// Defining these in global scope so tests can mock their implementation
export const MOCK_UUID = 'MOCKED_UUID'

const v4 = jest.fn()

v4.mockReturnValue(MOCK_UUID)

export { v4 }
