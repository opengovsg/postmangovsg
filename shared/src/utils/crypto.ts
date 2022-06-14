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
  return timingSafeEqual(generatedHashBuffer, hashBuffer)
}
