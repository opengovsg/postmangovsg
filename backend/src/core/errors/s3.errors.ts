export class RecipientColumnMissing extends Error {
  constructor() {
    super('Column labelled \'recipient\' is missing from uploaded file')
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}