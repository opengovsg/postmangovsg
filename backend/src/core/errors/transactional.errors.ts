export class RateLimitError extends Error {
  constructor(message = 'Too Many Requests') {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // Restore prototype chain
    Error.captureStackTrace(this)
  }
}

export class InvalidMessageError extends Error {
  constructor(
    message = 'Message template is invalid as it only contains invalid HTML tags'
  ) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}
