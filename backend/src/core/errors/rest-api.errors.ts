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

export class ApiInvalidCredentialsError extends RestApiError {
  constructor(message: string) {
    super(400, 'invalid_credentials', message)
  }
}

export class ApiNotFoundError extends RestApiError {
  constructor(message: string) {
    super(404, 'not_found', message)
  }
}

export class ApiAuthenticationError extends RestApiError {
  constructor(message: string) {
    super(401, 'unauthenticated', message)
  }
}

export class ApiMalformError extends RestApiError {
  constructor(message: string) {
    super(400, 'malformed', message)
  }
}

export class ApiAuthorizationError extends RestApiError {
  constructor(message: string) {
    super(403, 'unauthorized', message)
  }
}

export class ApiInvalidParametersError extends RestApiError {
  constructor(message: string) {
    super(400, 'invalid_parameters', message)
  }
}

export class ApiInvalidFromAddressError extends RestApiError {
  constructor(message: string) {
    super(400, 'invalid_from_address', message)
  }
}

export class ApiInvalidTemplateError extends RestApiError {
  constructor(message: string) {
    super(400, 'invalid_template', message)
  }
}

export class ApiInternalServerError extends RestApiError {
  constructor(message: string) {
    super(500, 'internal_server', message)
  }
}

export class ApiAlreadySentError extends RestApiError {
  constructor(message: string) {
    super(403, 'already_sent', message)
  }
}

export class ApiCampaignRedactedError extends RestApiError {
  constructor(message: string) {
    super(410, 'campaign_redacted', message)
  }
}
