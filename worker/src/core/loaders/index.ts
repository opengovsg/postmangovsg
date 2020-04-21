import scriptLoader from './script.loader'
import messageWorkerLoader from './message-worker.loader'
import SequelizeLoader from './sequelize.loader'

const loaders = async (): Promise<void> => {
  await SequelizeLoader.load()
  await scriptLoader({ sequelize: SequelizeLoader.sequelize })
  await messageWorkerLoader()
}

export { loaders }