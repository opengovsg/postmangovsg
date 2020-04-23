import expressLoader from './express.loader'
import swaggerLoader from './swagger.loader'
import sessionLoader from './session.loader'
import SequelizeLoader from './sequelize.loader'
import { Application } from 'express'


const loaders = async ({ app }: { app: Application }): Promise<void> => {
  await SequelizeLoader.load()
  await sessionLoader({ app })
  await expressLoader({ app })
  await swaggerLoader({ app })

}

export { loaders }