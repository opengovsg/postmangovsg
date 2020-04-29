import securityHeadersLoader from './security-headers.loader'
import expressLoader from './express.loader'
import swaggerLoader from './swagger.loader'
import sessionLoader from './session.loader'
import SequelizeLoader from './sequelize.loader'
import { Application } from 'express'
import cloudwatchLoader from './cloudwatch.loader'


const loaders = async ({ app }: { app: Application }): Promise<void> => {
  securityHeadersLoader({ app })
  await cloudwatchLoader()
  await SequelizeLoader.load()
  await sessionLoader({ app })
  await expressLoader({ app })
  await swaggerLoader({ app })
}

export { loaders }