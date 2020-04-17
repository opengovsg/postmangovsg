import { Request, Response, NextFunction } from 'express'
import { get } from 'lodash'
import { hashService } from '@core/services'

// SWTODO: Move to env var
const API_KEY_SALT_V1 = '$2b$10$o5JEFyRcL9WHQFqmu8W3mO'
// SWTODO: store this in DB
const API_KEY_HASH  = '$2b$10$o5JEFyRcL9WHQFqmu8W3mOfw50tXCTj4WltIg0y3JycUVdqlcUs02'
// SWTODO: Move this to config but not env var 
const API_KEY_VERSION = 'v1'

export const isCookieAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  if (req.session?.user?.id) {
    return next()
  }
  return res.sendStatus(401)
}

export const isApiKeyAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const headerKey = `ApiKey-${API_KEY_VERSION}`
  const authHeader = get(req, 'headers.authorization', '')
  
  const [header, apiKey] = authHeader.split(' ')

  const hash = await hashService.specifySalt(apiKey, API_KEY_SALT_V1)

  if (headerKey !== header || hash !== API_KEY_HASH) return res.sendStatus(401)

  return next()
}
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  return new Promise <Response | void> ((resolve, reject) => {
   req.session?.destroy((err) => {
     res.cookie('postmangovsg', '', { expires: new Date() }) // Makes cookie expire immediately
     if(!err) {
       resolve(res.sendStatus(200))
     }
     reject(err)
   })
  }).catch(err => next(err))
}
