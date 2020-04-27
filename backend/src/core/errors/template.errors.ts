export class MissingTemplateKeysError extends Error {
  public readonly missingKeys: string[]
  constructor(missingKeys: string[]) {
    super(`Template contains keys [${missingKeys}] that are not present in uploaded recipient list.`)
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

export class UnclosedTagError extends Error {
  constructor() {
    super('There are unclosed curly brackets in the template.')
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}

export class BlankTemplateVariableError extends Error {
  constructor() {
    super('Keyword not found within curly brackets.')
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}

export class SpecialCharacterVariableError extends Error {
  constructor() {
    super('Keyword not found within curly brackets.')
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)
  }
}