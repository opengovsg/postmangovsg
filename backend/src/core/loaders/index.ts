import { Application } from 'express'
import securityHeadersLoader from './security-headers.loader'
import expressLoader from './express.loader'
import swaggerLoader from './swagger.loader'
import sessionLoader from './session.loader'
import sequelizeLoader from './sequelize.loader'
import cloudwatchLoader from './cloudwatch.loader'

const loaders = async ({ app }: { app: Application }): Promise<void> => {
  securityHeadersLoader({ app })
  await cloudwatchLoader()
  await sequelizeLoader()
  await sessionLoader({ app })
  await expressLoader({ app })
  await swaggerLoader({ app })
}

export { loaders }
