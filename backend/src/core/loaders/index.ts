import { Application } from 'express'
import securityHeadersLoader from './security-headers.loader'
import expressLoader from './express.loader'
import swaggerLoader from './swagger.loader'
import sessionLoader from './session.loader'
import sequelizeLoader from './sequelize.loader'
import cloudwatchLoader from './cloudwatch.loader'
import uploadQueueLoader from './upload-queue.loader'

const loaders = async ({ app }: { app: Application }): Promise<void> => {
  securityHeadersLoader({ app })
  await cloudwatchLoader()
  await sequelizeLoader()
  sessionLoader({ app })
  expressLoader({ app })
  swaggerLoader({ app })
  await uploadQueueLoader()
}

export { loaders }
