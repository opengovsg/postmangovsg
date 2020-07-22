export class RecipientColumnMissing extends Error {
  constructor() {
    super("Column labelled 'recipient' is missing from uploaded file")
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}

export class UserError extends Error {
  constructor(name: string, message: string) {
    super(message)
    this.name = name
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}

export class CSVNotFoundError extends Error {
  constructor() {
    super(`File could not be loaded. Try re-uploading your file.`)
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}
