require('module-alias/register')
import { RedisService } from '@core/services'

module.exports = async function (): Promise<void> {
  await global.sequelize.close()
  await RedisService.shutdown()
}
