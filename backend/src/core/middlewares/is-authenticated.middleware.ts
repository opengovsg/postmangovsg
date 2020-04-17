import { Request, Response, NextFunction } from 'express'
import { get } from 'lodash'
import { hashService } from '@core/services'
import { ApiKey } from '@core/models'

// SWTODO: Move to env var
const API_KEY_SALT_V1 = '$2b$10$o5JEFyRcL9WHQFqmu8W3mO'
// SWTODO: Move this to config but not env var 
const API_KEY_VERSION = 'v1'

const doesHashExist = async (hash: string) =>  {
  return await ApiKey.findByPk(hash)
}

export const isCookieAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  if (req.session?.user?.id) {
    return next()
  }
  return res.sendStatus(401)
}

export const isApiKeyAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const headerKey = `ApiKey-${API_KEY_VERSION}`
  const authHeader = get(req, 'headers.authorization', '')
  
  const [header, content] = authHeader.split(' ')
  if (headerKey !== header) return res.sendStatus(401)

  const [name, version, key] = content.split('_')
  if (!name || !version || !key) return res.sendStatus(401)

  const hash = await hashService.specifySalt(key, API_KEY_SALT_V1)
  const apiKeyHash = `${name}_${version}_${hash}`

  const exists = await doesHashExist(apiKeyHash)
  if (!exists) return res.sendStatus(401)

  return next()
}export const logout = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
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
