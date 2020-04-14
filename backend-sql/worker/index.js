const { program } = require('commander')
const cmdParseInt = require('./db/util/cmd-parse-int')
program
  .requiredOption('-w, --worker-id <worker-id>', 'id of worker', cmdParseInt)
  .requiredOption('-d, --database <uri>', 'database uri')
  .option('-s, --batch-size <batch-size>', 'number of messages to sebd per second', cmdParseInt, 100)
  .option('-r, --grim-reaper', 'set this flag for grim reaper mode')
  .option('-v, --verbose', 'set this flag true for verbose')

program.parse(process.argv)
console.log(program.opts())

/** **** START ******/
const { workerId, database, grimReaper, verbose, batchSize } = program.opts()
const fs = require('fs')
const path = require('path')
const rdsCa = fs.readFileSync(path.resolve(__dirname, '../../backend/src/assets/db-ca.pem'))
const { Sequelize, QueryTypes } = require('sequelize')
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
const workerRunner = require('./worker-runner')
const main = async () => {
  await connection.sync()
  await workerRunner.start({ connection, workerId, grimReaper, verbose, batchSize })
}
main()
