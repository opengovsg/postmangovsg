export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export class InvalidPhoneNumberError extends Error {
  constructor(message: string) {
    super(message)
  }
}
