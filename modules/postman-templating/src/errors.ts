export class TemplateError extends Error {
  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}

export class RecipientColumnMissing extends Error {
  constructor() {
    super("Column labelled 'recipient' is missing from uploaded file")
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}

export class UnexpectedDoubleQuoteError extends Error {
  constructor() {
    super(
      `Double quote is misused, it should only use to quote a field.\nCorrect :"Hi how are you?" \nIncorrect : 40"N`
    )
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}