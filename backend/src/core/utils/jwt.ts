import jwt from 'jsonwebtoken'

import config from '@core/config'

const sign = (payload: any): string => {
  const secret = config.get('jwtSecret')
  if (secret === undefined) throw new Error('jwtSecret should not be undefined')
  return jwt.sign(payload, secret, { algorithm: 'HS256' })
}

const verify = (token: any): string | object => {
  const secret = config.get('jwtSecret')
  if (secret === undefined) throw new Error('jwtSecret should not be undefined')
  return jwt.verify(token, secret, { algorithms: ['HS256'] })
}

export const jwtUtils = {
  sign,
  verify,
}
