import config from '@core/config'
import jwt from 'jsonwebtoken'

const JWT_SECRET = config.get('jwtSecret')

export const jwtUtils = {
  sign: (payload: any): string =>
    jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' }),
  verify: (token: string): string | object =>
    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }),
}
