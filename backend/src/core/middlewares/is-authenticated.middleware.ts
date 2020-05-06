import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { User } from '@core/models'
import config from '@core/config'

const getApiKey = (req: Request): string | null => {
  const headerKey = 'Bearer'
  const authHeader = req.get('authorization')
  if(!authHeader) return null
  
  const [header, apiKey] = authHeader.split(' ')
  if (headerKey !== header) return null

  const [name, version, key] = apiKey.split('_')
  if (!name || !version || !key) return null

  return apiKey
}

const getApiKeyHash = async (apiKey: string): Promise<string | null> => {
  const [name, version, key] = apiKey.split('_')
  const hash = await bcrypt.hash(key, config.apiKey.salt)
  const apiKeyHash = `${name}_${version}_${hash.replace(config.apiKey.salt,'')}`
  return apiKeyHash
}

const getUserForApiKey = async (req: Request): Promise<User | null> => {
  const apiKey = getApiKey(req)
  if(apiKey !== null) {
    const hash = await getApiKeyHash(apiKey)
    const user = await User.findOne({ where: { apiKey: hash } , attributes: ['id'] })
    return user
  }
  return null
}

const checkCookie = (req: Request): boolean => {
  return req.session?.user?.id !== undefined
}

const isCookieOrApiKeyAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    if (checkCookie(req)) {
      return next()
    }
  
    const user = await getUserForApiKey(req)
    if(user!==null && req.session){
      // Ideally, we store the user id in res.locals for api key, because theoretically, no session was created.
      // Practically, we have to check multiple places for the user id when we want to retrieve the id
      // To avoid these checks, we assign the user id to the session property instead so that downstream middlewares can use it
      req.session.user = user
      return next()
    }   
    
    return res.sendStatus(401)
  } catch(err) {
    return next(err)
  }
}

const logout = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
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

export { isCookieOrApiKeyAuthenticated, logout }