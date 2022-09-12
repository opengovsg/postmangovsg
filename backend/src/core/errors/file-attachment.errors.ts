export class MaliciousFileError extends Error {
  constructor(
    message = 'Error: One or more attachments may be potentially malicious. Please check the attached files.'
  ) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}

export class UnsupportedFileTypeError extends Error {
  constructor(
    message = 'Error: One or more attachments may be an unsupported file type. Please check the attached files.'
  ) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}
