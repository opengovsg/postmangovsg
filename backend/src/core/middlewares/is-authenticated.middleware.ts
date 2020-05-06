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

const checkApiKey = async (req: Request): Promise<User | null> => {
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

export const isCookieOrApiKeyAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    if (checkCookie(req)) {
      return next()
    }
  
    const user = await checkApiKey(req)
    if(user!==null){
      // Store user id in res.locals so that downstream middlewares can use it
      res.locals.userId = user.id
      return next()
    }   
    
    return res.sendStatus(401)
  } catch(err) {
    return next(err)
  }
}

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  return new Promise <Response | void> ((resolve, reject) => {
   req.session?.destroy((err) => {
     res.cookie('postmangovsg', '', { expires: new Date() }) // Makes cookie expire immediately
     if(res.locals) delete res.locals.userId 

     if(!err) {
       resolve(res.sendStatus(200))
     }
     reject(err)
   })
  }).catch(err => next(err))
}

