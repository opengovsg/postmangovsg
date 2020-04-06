import express from 'express'
import session from 'express-session'
import config from '../config'

const sessionLoader = ({ app }: {app: express.Application}): void => {
  //TODO: Use something persistent as a session store
  const sessionOptions: session.SessionOptions = {
    name: 'postmangovsg',
    secret: config.session.secret,
    resave: true,
    saveUninitialized: false,
    cookie: config.session.cookieSettings,
  }
  app.set('trust proxy', 1) // For HTTPS cookies (our TLS terminates at load balancer, not ec2)
  app.use(session(sessionOptions))
}

export default sessionLoader