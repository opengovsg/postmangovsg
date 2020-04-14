import expressLoader from './express.loader'
import swaggerLoader from './swagger.loader'
import sessionLoader from './session.loader'
import scriptLoader from './script.loader'
import messageWorkerLoader from './message-worker.loader'
import SequelizeLoader from './sequelize.loader'
import { Application } from 'express'


const loaders = async ({ app }: { app: Application }): Promise<void> => {
  await SequelizeLoader.load()
  await scriptLoader({ sequelize: SequelizeLoader.sequelize })
  await sessionLoader({ app })
  await expressLoader({ app })
  await swaggerLoader({ app })
  await messageWorkerLoader()

}

export { loaders }