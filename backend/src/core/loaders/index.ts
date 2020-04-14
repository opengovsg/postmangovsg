import expressLoader from './express.loader'
import sequelizeLoader from './sequelize.loader'
import swaggerLoader from './swagger.loader'
import sessionLoader from './session.loader'
import scriptsLoader from './scripts.loader'
import { Application } from 'express'


const loaders = async ({ app }: { app: Application }): Promise<void> => {
  const connection = await sequelizeLoader()
  await scriptsLoader({ connection })
  await sessionLoader({ app })
  await expressLoader({ app })
  await swaggerLoader({ app })
}

export { loaders }