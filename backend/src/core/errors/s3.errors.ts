export class RecipientColumnMissing extends Error {
  constructor() {
    super("Column labelled 'recipient' is missing from uploaded file")
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}

export class UserError extends Error {
  constructor(name: string, message: string, stack?: string) {
    super(message)
    this.name = name
    if (stack) this.stack = stack
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}
