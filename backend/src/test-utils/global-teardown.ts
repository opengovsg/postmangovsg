import { sequelize } from './global-setup'

module.exports = async function (): Promise<void> {
  await sequelize.close()
}
