import { sequelizeLoader } from './sequelize'

const loaders = async (): Promise<void> => {
  await sequelizeLoader()
}

export { loaders }
export * from './config'