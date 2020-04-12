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

/****** START ******/
const { workerId, database, grimReaper, verbose, batchSize } = program.opts()
const { Sequelize } = require('sequelize')
const connection = new Sequelize(
  database, {
    dialect: 'postgres',
    logging: false,
  })
const workerRunner = require('./worker-runner')
main = async () => {
  await connection.sync()
  await workerRunner.start({ connection, workerId, grimReaper, verbose, batchSize })
  return
}
main()



