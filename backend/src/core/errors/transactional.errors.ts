export class RecipientError extends Error {
  constructor(message = 'Invalid recipient') {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // Restore prototype chain
    Error.captureStackTrace(this)
  }
}
