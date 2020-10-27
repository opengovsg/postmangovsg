export class RecipientColumnMissing extends Error {
  constructor() {
    super(
      "Error: 'recipient' column is missing from the uploaded recipient file. Please check the cell in your uploaded CSV file to ensure " +
        "the recipient's contact info is correctly labelled as 'recipient'."
    )
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
