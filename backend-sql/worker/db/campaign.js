const { program } = require('commander')
const cmdParseInt = require('./util/cmd-parse-int')
const COMMANDS = ['start', 'stop', 'retry']
program
  .requiredOption('-d, --database <uri>', 'database uri')
  .requiredOption('-i, --campaign-id <campaign-id>', 'call a method for this campaign', cmdParseInt)
  .requiredOption('-m, --method <method>', 'method to be called <start|stop|retry>', (value, dummyPrevious) => {
    value = value.toLowerCase()
    if (!COMMANDS.includes(value)) {
      console.error(`Error - method must be one of "${COMMANDS.join(',')}". You supplied "${value}".`)
      process.exit(1)
    }
    return value
  })
program.parse(process.argv)
console.log(program.opts())
const main = async () => {
  const { database, campaignId, method } = program.opts()
  const fs = require('fs')
  const path = require('path')
  const rdsCa = fs.readFileSync(path.resolve(__dirname, '../../../backend/src/assets/db-ca.pem'))
  const { Sequelize } = require('sequelize')
  const connection = new Sequelize(
    database, {
      dialect: 'postgres',
      logging: false,
      pool: { max: 150, min: 0, acquire: 600000 },
      ssl: {
        rejectUnauthorized: true,
        ca: [rdsCa]
      }
    })
  const dbUtil = require('./util/methods')(connection)
  switch (method) {
  case 'start':
    console.log(`Inserting job for campaignId=${campaignId}`)
    await dbUtil.insertJob(campaignId)
    break
  case 'stop':
    console.log(`Stopping jobs for campaignId=${campaignId}`)
    await dbUtil.stopJobs(campaignId)
    break
  case 'retry':
    console.log(`Retrying jobs for campaignId=${campaignId}`)
    await dbUtil.retryJobs(campaignId)
    break
  default:
    return
  }
  process.exit(0)
}

main()
