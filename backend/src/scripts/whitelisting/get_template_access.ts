/* eslint-disable no-console */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
require('module-alias/register')

import sequelizeLoader from '@core/loaders/sequelize.loader'
import { User } from '@core/models'
import { GovsgTemplate, GovsgTemplatesAccess } from '@govsg/models'
import { Op } from 'sequelize'
import { Parser } from '@json2csv/plainjs'
import { string as stringFormatter } from '@json2csv/formatters'
import * as fs from 'fs'

/**
 * Returns a csv file detailing user template access.
 * The fields of the csv file returned are as follows:
 * templateLabel, userEmail
 *
 * Accepts optional arguments. If arguments are passed in, the function will only
 * return the user access for the templates specified. Otherwise, the user access
 * for all templates will be returned.
 */
void (async function main() {
  try {
    await sequelizeLoader()
    const templatesToFind: string[] = process.argv.slice(2)
    let templates: GovsgTemplate[]
    if (templatesToFind.length === 0) {
      console.log('Fetching data for all templates')
      templates = await GovsgTemplate.findAll({})
    } else {
      console.log(
        `Fetching data for the following templates: ${templatesToFind}`
      )
      templates = await GovsgTemplate.findAll({
        where: {
          whatsappTemplateLabel: {
            [Op.in]: templatesToFind,
          },
        },
      })
      if (templatesToFind.length !== templates.length) {
        throw new Error(
          `Could not find some templates. Wanted ${templatesToFind}, Got ${templates.map(
            (t) => t.whatsappTemplateLabel
          )}`
        )
      }
    }
    const templateIds = templates.map((t) => t.id)
    const templateAccess = await GovsgTemplatesAccess.findAll({
      where: {
        templateId: {
          [Op.in]: templateIds,
        },
      },
      include: [GovsgTemplate, User],
    })

    const opts = {
      fields: ['templateLabel', 'userEmail'],
      formatters: {
        string: stringFormatter({ quote: '' }),
      },
    }
    const csvData = templateAccess.map((ta) => ({
      templateLabel: ta.govsgTemplate.whatsappTemplateLabel,
      userEmail: ta.user.email,
    }))
    const parser = new Parser(opts)
    const csv = parser.parse(csvData)
    fs.writeFileSync('temp/output/template_access.csv', csv)
    console.log('Done ✅')
  } catch (err) {
    console.log(err)
  }

  process.exit(0)
})()
