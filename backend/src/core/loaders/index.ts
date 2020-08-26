import { Application } from 'express'
import securityHeadersLoader from './security-headers.loader'
import expressLoader from './express.loader'
import swaggerLoader from './swagger.loader'
import sessionLoader from './session.loader'
import sequelizeLoader from './sequelize.loader'
import cloudwatchLoader from './cloudwatch.loader'
import loader from './secrets.loader'

const loaders = async ({ app }: { app: Application }): Promise<void> => {
  await loader()
  securityHeadersLoader({ app })
  await cloudwatchLoader()
  await sequelizeLoader()
  await sessionLoader({ app })
  await expressLoader({ app })
  await swaggerLoader({ app })
}

export { loaders }
