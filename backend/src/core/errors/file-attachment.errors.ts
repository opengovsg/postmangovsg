export class UnsupportedFileTypeError extends Error {
  constructor(
    message = 'Error: One or more attachments may be an unsupported file type. Please check the attached files.'
  ) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}
