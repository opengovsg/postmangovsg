import express from 'express'
import session from 'express-session'
import connectRedis from 'connect-redis'
import config from '@core/config'

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
    // A session expires maxAge after its data last changed (around login), not after its
    // last use. Resaving or touching it on every request lets a replayed cookie live forever.
    resave: false,
    saveUninitialized: false,
    cookie: config.get('session.cookieSettings'),
    store: new sessionStore({
      client: (app as any).redisService.sessionClient,
      logErrors: true,
      disableTouch: true,
    }),
  }
  app.set('trust proxy', 1) // For HTTPS cookies (our TLS terminates at load balancer, not ec2)
  app.use(session(sessionOptions))
}

export default sessionLoader
