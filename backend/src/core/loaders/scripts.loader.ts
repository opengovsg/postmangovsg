import fs from 'fs'
import { Sequelize } from 'sequelize/types'
import logger from '@core/logger'
import { sqlFilePaths } from '@core/resources/sql'
import { sqlFilePaths as emailSqlFilePaths } from '@email/resources/sql'
import { sqlFilePaths as smsSqlFilePaths } from '@sms/resources/sql'

const scriptsLoader = async ({ connection }: {connection: Sequelize}): Promise<void> => {
  const scriptsFilePaths = [
    ...sqlFilePaths,
    ...emailSqlFilePaths,
    ...smsSqlFilePaths,
  ]
  const scripts = scriptsFilePaths.map((filePath: string) => {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) reject(err)
        resolve(data)
      })
    }).then((data) => {
      return connection.query(data as string)
    })
  })
  return Promise.all(scripts)
    .then(() => {
      logger.info('Sql scripts loaded')
    })
    .catch(err => {
      logger.error(`Could not load sql scripts from ${scriptsFilePaths} \t ${err}`)
    })
}

export default scriptsLoader