import { Request, Response, NextFunction } from 'express'
import { get } from 'lodash'
import { hashService } from '@core/services'
import { ApiKey } from '@core/models'
import config from '@core/config'

const doesHashExist = async (hash: string) =>  {
  return await ApiKey.findByPk(hash)
}

const checkCookie = async (req: Request): Promise<boolean> => {
  return req.session?.user?.id
}

const checkApiKey = async (req: Request): Promise<boolean> => {
  const headerKey = `ApiKey-${config.apiKey.version}`
  const authHeader = get(req, 'headers.authorization', '')
  
  const [header, content] = authHeader.split(' ')
  if (headerKey !== header) return false

  const [name, version, key] = content.split('_')
  if (!name || !version || !key) return false

  const hash = await hashService.specifySalt(key, config.apiKey.salt)
  const apiKeyHash = `${name}_${version}_${hash}`

  const exists = await doesHashExist(apiKeyHash)
  if (!exists) return false

  return true
}

export const isCookieOrApiKeyAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  if (await checkCookie(req) || await checkApiKey(req)) {
    return next()
  }
  return res.sendStatus(401)
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
  if (await checkCookie(req)) {
    return next()
  }
  return res.sendStatus(401)
}

export const isApiKeyAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  if (await checkApiKey(req)) {
    return next()
  }
  return res.sendStatus(401)
}
