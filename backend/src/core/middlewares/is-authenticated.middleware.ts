import { Request, Response, NextFunction } from 'express'
import { get } from 'lodash'
import { hashService } from '@core/services'
import { ApiKey } from '@core/models'
import config from '@core/config'

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
  const headerKey = `ApiKey-${config.apiKey.version}`
  const authHeader = get(req, 'headers.authorization', '')
  
  const [header, content] = authHeader.split(' ')
  if (headerKey !== header) return res.sendStatus(401)

  const [name, version, key] = content.split('_')
  if (!name || !version || !key) return res.sendStatus(401)

  const hash = await hashService.specifySalt(key, config.apiKey.salt)
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
