import expressLoader from './express.loader'
import sequelizeLoader from './sequelize.loader'
import swaggerLoader from './swagger.loader'

import { Application } from 'express'

const loaders = async ({ app }: { app: Application}): Promise<void> => {
  await sequelizeLoader()
  await expressLoader({ app })
  await swaggerLoader({ app })
}

export { loaders }