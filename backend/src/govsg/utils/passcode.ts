import { randomInt } from 'node:crypto'

export const createPasscode = () => {
  return randomInt(0, Math.pow(10, 4)).toString().padStart(4, '0')
}
