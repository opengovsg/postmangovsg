// need to import this as globalTeardown does not recognize moduleNameMapper
// https://github.com/facebook/jest/issues/11644
import 'tsconfig-paths/register'

import { sequelize } from './global-setup'

module.exports = async function (): Promise<void> {
  await sequelize.close()
}
