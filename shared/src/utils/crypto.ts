import { createHash } from 'crypto'

export const getSha256Hash = (text: string) => {
  return createHash('sha256').update(text).digest('hex')
}
