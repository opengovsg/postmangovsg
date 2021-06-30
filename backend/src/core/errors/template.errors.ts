export class MissingTemplateKeysError extends Error {
  public readonly missingKeys: string[]
  constructor(missingKeys: string[]) {
    super(
      `Error: The following keyword(s) { ${missingKeys} } are not found in the uploaded recipient list.`
    )
    this.missingKeys = missingKeys
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}

export class HydrationError extends Error {
  constructor() {
    super('Error hydrating template')
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}

export class InvalidRecipientError extends Error {
  constructor(
    message = 'There are invalid recipient(s) in the uploaded recipient list.\nPlease check the recipient column in your csv file.'
  ) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}
