// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
require('module-alias/register')

import sequelizeLoader from '@core/loaders/sequelize.loader'
import { User } from '@core/models'
import { ApiKey } from '@core/models/user/api-key'
import { Op } from 'sequelize'
void (async function main() {
  await sequelizeLoader()
  const users = await User.findAll({
    where: { apiKeyHash: { [Op.not]: null } },
  })
  for (const u of users) {
    const existingKey = await ApiKey.findOne({
      where: { userId: u.id.toString() },
    })
    if (existingKey) continue

    const newKey = await ApiKey.create({
      userId: u.id.toString(),
      hash: u.apiKeyHash as string,
      lastFive: '*****',
      label: 'default',
    } as ApiKey)
    // eslint-disable-next-line no-console
    console.log(`Created key ${newKey.id} for user ${u.email}`)
  }
  process.exit(0)
})()
