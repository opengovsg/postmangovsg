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
import { GovsgTemplatesAccess } from '@govsg/models'

type RawOfficerData = {
  name: string
  email: string
  designation: string
  agency: string
  id?: number
}

void (async function main() {
  await sequelizeLoader()
  const rawDataToInsert = (
    await csv({ output: 'csv' }).fromFile(
      'temp/Agency Whitelist - Whitelist.csv'
    )
  )
    .filter((r) => r[4] === 'N')
    .map(
      (r) =>
        ({
          name: r[0],
          email: r[1].toLowerCase(),
          designation: r[2],
          agency: r[3],
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
  if (domains.length !== rawUniqueDomains.length) {
    throw new Error(
      `There are missing domains in DB. Needed ${rawUniqueDomains}, Got ${domains.map(
        (d) => d.domain
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
  const existingEmails = existingUsers.map((u) => u.email)
  const newUsers = await User.bulkCreate(
    rawDataToInsert
      .filter((r) => !existingEmails.includes(r.email))
      .map(
        (r) =>
          ({
            email: r.email,
            emailDomain: `@${r.email.split('@')[1]}`,
          } as User)
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
    )
  )
  console.log(
    JSON.stringify(
      inserted.map((i) => i.toJSON()),
      null,
      2
    )
  )
  const insertedAccess = await GovsgTemplatesAccess.bulkCreate(
    allUsers.map(
      (u) =>
        ({
          userId: u.id,
          templateId: 1,
        } as GovsgTemplatesAccess)
    )
  )
  console.log(
    JSON.stringify(
      insertedAccess.map((i) => i.toJSON()),
      null,
      2
    )
  )
  console.log('Done ✅')
  process.exit(0)
})()
