export class RateLimitError extends Error {
  constructor(message = 'Too Many Requests') {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // Restore prototype chain
    Error.captureStackTrace(this)
  }
}

export const EMPTY_MESSAGE_ERROR =
  'Message is empty after removing invalid HTML tags'

export class EmptyMessageError extends Error {
  constructor(message = EMPTY_MESSAGE_ERROR) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}
