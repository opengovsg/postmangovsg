import expressLoader from './express.loader'
import sequelizeLoader from './sequelize.loader'
import swaggerLoader from './swagger.loader'
import sessionLoader from './session.loader'

import { Application } from 'express'

const loaders = async ({ app }: { app: Application }): Promise<void> => {
  await sequelizeLoader()
  sessionLoader({ app })
  expressLoader({ app })
  swaggerLoader({ app })
}

export { loaders }