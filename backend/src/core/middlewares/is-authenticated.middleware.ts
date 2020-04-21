import { Request, Response, NextFunction } from 'express'
import { get } from 'lodash'
import { hashService } from '@core/services'
import { ApiKey } from '@core/models'
import config from '@core/config'

const doesHashExist = async (hash: string): Promise<ApiKey | null > =>  {
  return ApiKey.findByPk(hash)
}

const checkCookie = (req: Request): boolean => {
  if (req.session?.user?.id) return true
  return false
}

const getApiKey = (req: Request): string | null => {
  const headerKey = `ApiKey-${config.apiKey.version}`
  const authHeader = get(req, 'headers.authorization', '')
  
  const [header, apiKey] = authHeader.split(' ')
  if (headerKey !== header) return null

  const [name, version, key] = apiKey.split('_')
  if (!name || !version || !key) return null

  return apiKey
}

const getApiKeyHash = async (apiKey: string): Promise<string | null> => {
  const [name, version, key] = apiKey.split('_')

  const hash = await hashService.specifySalt(key, config.apiKey.salt)
  const apiKeyHash = `${name}_${version}_${hash}`

  const exists = await doesHashExist(apiKeyHash)
  if (!exists) return null

  return apiKeyHash
}

export const isCookieOrApiKeyAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  if (checkCookie(req)) {
    return next()
  }

  const apiKey = getApiKey(req)
  if (apiKey === null) {
    return res.sendStatus(401)
  }

  const hash = await getApiKeyHash(apiKey)
  if (hash === null) {
    return res.sendStatus(401)
  }

  // Store hash in res.locals so that downstream middlewares can use it
  res.locals.apiKeyHash = hash
  
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

export const isCookieAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  if (checkCookie(req)) {
    return next()
  }
  return res.sendStatus(401)
}
