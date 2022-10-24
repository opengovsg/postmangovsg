import config from '@core/config'
import connectRedis from 'connect-redis'
import express from 'express'
import session from 'express-session'

/**
 * Initializes a session manager for logins
 *
 */
const sessionLoader = ({ app }: { app: express.Application }): void => {
  const sessionStore: connectRedis.RedisStore = connectRedis(session)
  if (!config.get('session.secret')) {
    throw new Error("'session.secret' required but missing'")
  }
  const sessionOptions: session.SessionOptions = {
    name: config.get('session.cookieName'),
    secret: config.get('session.secret'),
    resave: true,
    saveUninitialized: false,
    cookie: config.get('session.cookieSettings'),
    store: new sessionStore({
      client: (app as any).redisService.sessionClient,
      logErrors: true,
    }),
  }
  app.set('trust proxy', 1) // For HTTPS cookies (our TLS terminates at load balancer, not ec2)
  app.use(session(sessionOptions))
}

export default sessionLoader
