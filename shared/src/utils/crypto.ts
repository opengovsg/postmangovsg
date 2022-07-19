import { createHmac, timingSafeEqual } from 'crypto'

export const getSha256Hash = (secret: string, text: string): string => {
  return createHmac('sha256', secret).update(text).digest('hex')
}

export const compareSha256Hash = (
  secret: string,
  text: string,
  hash: string
): boolean => {
  const generatedHashBuffer = Buffer.from(getSha256Hash(secret, text))
  const hashBuffer = Buffer.from(hash)
  try {
    return timingSafeEqual(generatedHashBuffer, hashBuffer)
  } catch (e) {
    // Why we're doing this?
    // If the hashBuffers don't have the same length, `timingSafeEqual` will throw
    // an error 🙄  instead of returning false, hence this catch.
    // Extra implication: if there're other errors thrown from timingSafeEqual,
    // we will return false as well
    return false
  }
}
