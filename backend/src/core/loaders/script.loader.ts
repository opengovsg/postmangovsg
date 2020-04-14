import fs from 'fs'
import { Sequelize } from 'sequelize/types'
import logger from '@core/logger'
import { sqlFilePaths } from '@core/resources/sql'
import { sqlFilePaths as emailSqlFilePaths } from '@email/resources/sql'
import { sqlFilePaths as smsSqlFilePaths } from '@sms/resources/sql'

const scriptLoader = async ({ sequelize }: {sequelize: Sequelize | undefined}): Promise<void> => {
  if(sequelize){
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
        return sequelize.query(data as string)
      })
    })
    return Promise.all(scripts)
      .then(() => {
        logger.info('Sql scripts loaded')
      })
      .catch(err => {
        logger.error(`Could not load sql scripts from ${scriptsFilePaths} \t ${err}`)
        process.exit(1)
      })
  } else{
    logger.error('Sequelize connection was not instantiasted')
  }
 
}

export default scriptLoader