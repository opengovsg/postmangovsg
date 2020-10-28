export class PostmanTelegramError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PostmanTelegramError'

    // Manually set prototype
    // Refer: https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, PostmanTelegramError.prototype)
  }
}
