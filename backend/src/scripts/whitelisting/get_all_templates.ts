/* eslint-disable no-console */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()
require('module-alias/register')

import sequelizeLoader from '@core/loaders/sequelize.loader'
import { GovsgTemplate } from '@govsg/models'
import { Parser } from '@json2csv/plainjs'
import { string as stringFormatter } from '@json2csv/formatters'
import * as fs from 'fs'

/**
 * Returns a csv file of all templates in the database.
 * The fields of the csv file returned are as follows:
 * templateId, templateLabel, templateName, multilingualSupport
 */
void (async function main() {
  try {
    await sequelizeLoader()
    const templates = await GovsgTemplate.findAll()

    const opts = {
      fields: [
        'templateId',
        'templateLabel',
        'templateName',
        'multilingualSupport',
      ],
      formatters: {
        string: stringFormatter({ quote: '' }),
      },
    }
    const csvData = templates.map((t) => ({
      templateId: t.id,
      templateLabel: t.whatsappTemplateLabel,
      templateName: t.name,
      multilingualSupport: t.multilingualSupport,
    }))
    console.log(csvData)
    const parser = new Parser(opts)
    const csv = parser.parse(csvData)
    fs.writeFileSync('temp/output/templates.csv', csv)
    console.log('Done ✅')
  } catch (err) {
    console.log(err)
  }

  process.exit(0)
})()
