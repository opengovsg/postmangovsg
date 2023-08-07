/* eslint-disable no-console */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
require('module-alias/register')

import sequelizeLoader from '@core/loaders/sequelize.loader'
import { User } from '@core/models'
import { Op } from 'sequelize'
import { GovsgTemplate, GovsgTemplatesAccess } from '@govsg/models'
import {
  ALL_TEMPLATE_ACCESS,
  MCI_TEMPLATE_ACCESS,
  OGP_TEMPLATE_ACCESS,
  SECTION_DIVIDER,
} from './constants'

/**
 * Updates the user template access for the following default groups:
 * 1. OGP accessible templates
 * 2. MCI accessible templates
 * 3. Templates accessible to all users
 */
void (async function main() {
  await sequelizeLoader()

  const templates = await GovsgTemplate.findAll({})
  const templateLabelToId = new Map<string | null, number>()
  templates.forEach((t) => {
    templateLabelToId.set(t.whatsappTemplateLabel, t.id)
  })

  const usersToUpdate = await User.findAll({
    where: {
      email: {
        [Op.or]: [
          {
            [Op.endsWith]: '@open.gov.sg',
          },
          {
            [Op.endsWith]: '@mci.gov.sg',
          },
        ],
      },
    },
  })
  console.log(SECTION_DIVIDER)
  console.log(`Number of users to update: ${usersToUpdate.length}`)
  const ogpOfficers = usersToUpdate.filter(
    (u) => u.email.split('@')[1] === 'open.gov.sg'
  )
  const ogpAccessRule = await GovsgTemplatesAccess.bulkCreate(
    ogpOfficers.flatMap((u) =>
      OGP_TEMPLATE_ACCESS.map(
        (t) =>
          ({
            userId: u.id,
            templateId: templateLabelToId.get(t),
          } as unknown as GovsgTemplatesAccess)
      )
    ),
    {
      ignoreDuplicates: true,
    }
  )
  const mciOfficers = usersToUpdate.filter(
    (u) => u.email.split('@')[1] === 'mci.gov.sg'
  )
  const mciAccessRule = await GovsgTemplatesAccess.bulkCreate(
    mciOfficers.flatMap((u) =>
      MCI_TEMPLATE_ACCESS.map(
        (t) =>
          ({
            userId: u.id,
            templateId: templateLabelToId.get(t),
          } as unknown as GovsgTemplatesAccess)
      )
    ),
    {
      ignoreDuplicates: true,
    }
  )

  const allAccessRule = await GovsgTemplatesAccess.bulkCreate(
    usersToUpdate.flatMap((u) =>
      ALL_TEMPLATE_ACCESS.map(
        (t) =>
          ({
            userId: u.id,
            templateId: templateLabelToId.get(t),
          } as unknown as GovsgTemplatesAccess)
      )
    ),
    {
      ignoreDuplicates: true,
    }
  )
  const insertedAccess = [...ogpAccessRule, ...mciAccessRule, ...allAccessRule]
  console.log(SECTION_DIVIDER)
  console.log(
    `Number of rows inserted into Govsg Template Access table: ${insertedAccess.length}`
  )
  console.log('Info inserted into Govsg Template Access table:')
  console.log(
    JSON.stringify(
      insertedAccess.map((i) => i.toJSON()),
      null,
      2
    )
  )
  console.log(SECTION_DIVIDER)
  console.log('Done ✅')
  process.exit(0)
})()
