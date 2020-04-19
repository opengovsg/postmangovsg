import bcrypt from 'bcrypt'
import logger from '@core/logger'

const SALT_ROUNDS = 10

const randomSalt = (value: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(value, SALT_ROUNDS, (error, hash) => {
      if (error) {
        logger.error(`Failed to hash value: ${error}`)
        reject(error)
      }
      resolve(hash as string)
    })
  })
}

const specifySalt = (value: string, salt: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(value, salt, (error, hash) => {
      if (error) {
        logger.error(`Failed to hash value: ${error}`)
        reject(error)
      }
      resolve(hash as string)
    })
  }) 
}

export const hashService = { randomSalt, specifySalt }
