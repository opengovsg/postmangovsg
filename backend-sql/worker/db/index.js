const { program } = require('commander')
const cmdParseInt = require('./util/cmd-parse-int')
program
  .requiredOption('-d, --database <uri>', 'database uri')
  .option('-f, --dir <function directory>', 'path to sql functions', '../../sql/functions')
  .option('-c, --num-creds <creds>', 'number of credentials', cmdParseInt, 10)
  .option('-p, --num-campaigns <campaigns>', 'number of campaigns per credential', cmdParseInt, 2)
  .option('-w, --num-workers <workers>', 'number of workers', cmdParseInt, 3)
  .option('-r, --num-recipients <recipients>', 'number of recipients per campaign', cmdParseInt, 1000)
  .option('-j, --jobs', 'set flag to insert all jobs', false)
program.parse(process.argv)

/** **** START ******/
const { database, dir, numCreds, numCampaigns, numWorkers, numRecipients, jobs } = program.opts()
const { Sequelize } = require('sequelize')
const connection = new Sequelize(
  database, {
    dialect: 'postgres',
    logging: false,
  })
const dbRunner = require('./db-runner')
const main = async () => {
  await connection.sync()
  await dbRunner.start({ connection, dir, numCreds, numCampaigns, numWorkers, numRecipients, jobs })
  process.exit(0)
}

main()
