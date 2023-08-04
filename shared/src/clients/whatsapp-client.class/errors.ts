export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export class InvalidRecipientError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export class RateLimitError extends Error {
  constructor(message = 'Too Many Requests') {
    super(message)
  }
}

export class MessageIdNotFoundWebhookError extends Error {
  constructor(message: string) {
    super(message)
  }
}
