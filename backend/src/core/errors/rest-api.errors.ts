export class RestApiError extends Error {
  readonly httpStatusCode: number
  readonly errorCode: string
  constructor(httpStatusCode: number, errorCode: string, message: string) {
    super(message)
    this.httpStatusCode = httpStatusCode
    this.errorCode = errorCode
  }
}

export class ApiValidationError extends RestApiError {
  constructor(message: string) {
    super(400, 'api_validation', message)
  }
}

export class ApiInvalidRecipientError extends RestApiError {
  constructor(message: string) {
    super(400, 'invalid_recipient', message)
  }
}

export class ApiInvalidSmsCredentialsError extends RestApiError {
  constructor(message: string) {
    super(400, 'invalid_sms_credentials', message)
  }
}

export class ApiNotFoundError extends RestApiError {
  constructor(message: string) {
    super(404, 'not_found', message)
  }
}
