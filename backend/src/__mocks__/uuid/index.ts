// Defining these in global scope so tests can mock their implementation
export const HASHED_CREDS = 'HASHED_CREDS'

const v4 = jest.fn()

v4.mockReturnValue(HASHED_CREDS)

export { v4 }
