import jwt from 'jsonwebtoken'

import config from '@core/config'

const JWT_SECRET = config.jwtSecret

export const jwtUtils = {
  sign: (payload: any) => jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' }),
  verify: (token: string) => jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }),
}