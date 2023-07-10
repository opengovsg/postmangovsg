// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
require('module-alias/register')

import sequelizeLoader from '@core/loaders/sequelize.loader'
import { ChannelType } from '@core/constants'
import { UserExperimental } from '@core/models/user/user-experimental'
import { GovsgTemplate, GovsgTemplatesAccess } from '@govsg/models'

void (async function main() {
  await sequelizeLoader()
  // get all GovSG experimental users
  const userIds = await UserExperimental.findAll({
    where: {
      feature: ChannelType.Govsg,
    },
  }).then((users) => users.map((user) => user.userId))
  // get all existing GovSG templates
  const templateIds = await GovsgTemplate.findAll().then((templates) =>
    templates.map((template) => template.id)
  )
  // dot product of userIds and templateIds
  const objArray = userIds.flatMap((userId) =>
    templateIds.map((templateId) => ({ userId, templateId }))
  )
  const inserted = await GovsgTemplatesAccess.bulkCreate(
    objArray.map(
      ({ userId, templateId }) =>
        ({
          userId: userId.toString(),
          templateId: templateId.toString(),
        } as unknown as GovsgTemplatesAccess)
    )
  )
  console.log(inserted.map((access) => access.toJSON()))
  console.log('Done ✅')
  process.exit(0)
})()
