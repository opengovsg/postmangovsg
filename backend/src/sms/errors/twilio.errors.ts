export class TwilioError extends Error {
  statusCode: number

  constructor({
    message = 'Internal Server Error',
    statusCode = 500,
  }: {
    message: string
    statusCode: number
  }) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain
    Error.captureStackTrace(this)

    this.statusCode = statusCode
  }
}
