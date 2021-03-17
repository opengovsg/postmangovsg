export class RecipientError extends Error {
  constructor(message = 'Invalid recipient') {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // Restore prototype chain
    Error.captureStackTrace(this)
  }
}

export class RateLimitError extends Error {
  constructor(message = 'Too Many Requests') {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // Restore prototype chain
    Error.captureStackTrace(this)
  }
}
