/* eslint-disable no-console */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
require('module-alias/register')

import sequelizeLoader from '@core/loaders/sequelize.loader'
import { Domain, User } from '@core/models'
import { Op } from 'sequelize'
import csv from 'csvtojson'
import { UserExperimental } from '@core/models/user/user-experimental'
import { ChannelType } from '@core/constants'
import { GovsgTemplate, GovsgTemplatesAccess } from '@govsg/models'
import {
  ALL_TEMPLATE_ACCESS,
  MCI_TEMPLATE_ACCESS,
  OGP_TEMPLATE_ACCESS,
  SECTION_DIVIDER,
} from './constants'

type RawOfficerData = {
  name: string
  email: string
  designation: string
  agency: string
  templates: string[]
  id?: number
}

void (async function main() {
  await sequelizeLoader()
  const rawDataToInsert = (
    await csv({ output: 'csv' }).fromFile(
      'temp/Agency Whitelist - Whitelist.csv'
    )
  )
    .filter((r) => r[5] === 'N')
    .map(
      (r) =>
        ({
          name: r[0],
          email: r[1].toLowerCase(),
          designation: r[2],
          agency: r[3],
          templates: r[4] ? r[4].split(';') : [],
        } as RawOfficerData)
    )
  const rawUniqueDomains = Array.from(
    new Set(rawDataToInsert.map((r) => `@${r.email.split('@')[1]}`))
  )
  const domains = await Domain.findAll({
    where: {
      domain: {
        [Op.in]: rawUniqueDomains,
      },
    },
  })
  console.log(`Number of users in raw data: ${rawDataToInsert.length}`)
  if (domains.length !== rawUniqueDomains.length) {
    throw new Error(
      `There are missing domains in DB. Needed ${rawUniqueDomains}, Got ${domains.map(
        (d) => d.domain
      )}`
    )
  }
  const templatesToAccess = Array.from(
    new Set(rawDataToInsert.flatMap((r) => r.templates))
  )
  console.log(templatesToAccess)
  const templates = await GovsgTemplate.findAll({})
  const templateLabelToId = new Map<string | null, number>()
  templates.forEach((t) => {
    templateLabelToId.set(t.whatsappTemplateLabel, t.id)
  })
  if (templatesToAccess.some((ta) => !templateLabelToId.has(ta))) {
    throw new Error(
      `There are templates that do not exist. Needed ${templatesToAccess}, Have ${templates.map(
        (t) => t.whatsappTemplateLabel
      )}`
    )
  }

  const existingUsers = await User.findAll({
    where: {
      email: {
        [Op.in]: rawDataToInsert.map((r) => r.email),
      },
    },
  })
  console.log(SECTION_DIVIDER)
  console.log(`Number of existing users: ${existingUsers.length}`)
  const existingEmails = existingUsers.map((u) => u.email)
  console.log(JSON.stringify(existingEmails, null, 2))
  const newUsers = await User.bulkCreate(
    rawDataToInsert
      .filter((r) => !existingEmails.includes(r.email))
      .map(
        (r) =>
          ({
            email: r.email,
            emailDomain: `@${r.email.split('@')[1]}`,
          } as User)
      ),
    {
      ignoreDuplicates: true,
    }
  )
  console.log(SECTION_DIVIDER)
  console.log(`Number of new users: ${newUsers.length}`)
  console.log(
    JSON.stringify(
      newUsers.map((i) => i.toJSON()),
      null,
      2
    )
  )
  const allUsers = [...existingUsers, ...newUsers]
  const officersWithIds = rawDataToInsert.map(
    (r) =>
      ({
        ...r,
        id: allUsers.find((u) => u.email === r.email)?.id,
      } as RawOfficerData)
  )
  const inserted = await UserExperimental.bulkCreate(
    officersWithIds.map(
      (o) =>
        ({
          feature: ChannelType.Govsg,
          userId: o.id,
          metadata: {
            officer_name: o.name,
            agency: o.agency,
            officer_designation: o.designation,
          },
        } as UserExperimental)
    ),
    {
      ignoreDuplicates: true,
    }
  )
  console.log(SECTION_DIVIDER)
  console.log(
    `Number of rows inserted into User Experimental table: ${inserted.length}`
  )
  console.log('Info inserted into User Experimental table:')
  console.log(
    JSON.stringify(
      inserted.map((i) => i.toJSON()),
      null,
      2
    )
  )
  // Gives user access to templates according to the csv input
  const csvAccessRule = await GovsgTemplatesAccess.bulkCreate(
    officersWithIds.flatMap((u) =>
      u.templates.map(
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
  const ogpOfficers = officersWithIds.filter(
    (u) => u.email.split('@')[1] === 'open.gov.sg'
  )
  // Gives OGP officers access to OGP default templates
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
  const mciOfficers = officersWithIds.filter(
    (u) => u.email.split('@')[1] === 'mci.gov.sg'
  )
  // Gives MCI officers access to MCI default templates
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
  // Gives access to all default templates
  const allAccessRule = await GovsgTemplatesAccess.bulkCreate(
    officersWithIds.flatMap((u) =>
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
  const insertedAccess = [
    ...csvAccessRule,
    ...ogpAccessRule,
    ...mciAccessRule,
    ...allAccessRule,
  ]
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
