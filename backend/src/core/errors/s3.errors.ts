export class RecipientColumnMissing extends Error {
  constructor() {
    super(`Recipients column is missing from uploaded file`)
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}