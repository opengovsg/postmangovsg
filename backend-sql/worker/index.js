const { program } = require('commander')
const cmdParseInt = require('./util/cmd-parse-int')
program
  .requiredOption('-w, --worker-id <worker-id>', 'id of worker', cmdParseInt)
  .requiredOption('-d, --database <uri>', 'database uri')
  .option('-s, --batch-size <batch-size>', 'number of messages to sebd per second', cmdParseInt, 100)
  .option('-r, --grim-reaper', 'set this flag for grim reaper mode')
  .option('-v, --verbose', 'set this flag true for verbose')
 
program.parse(process.argv)
console.log(program.opts())

/****** START ******/
const { Sequelize } = require('sequelize')
const Worker = require('./worker')
const { workerId, database, grimReaper, verbose, batchSize } = program.opts()
const sequelize = new Sequelize(
  database, {
    dialect: 'postgres',
    logging: false,
  })


const enqueueAndSend = async (batchSize) => {
  const { jobId, campaignId } = await w.getNextJob()
  if(jobId){
    await w.enqueueMessages(jobId)
    let hasNext = true
    while(hasNext){
      const messages = await w.getMessages(jobId, batchSize)
      if(!messages[0]) {
        hasNext = false
      } else{
        const start = Date.now()
        await Promise.all(messages.map(m => w.sendMessage(m)))
        // Make sure at least 1 second has elapsed
        const wait = Math.max(0, 1000 - (Date.now() - start))
        await waitForMs(wait)
      }
    }
  }
}

const waitForMs = (ms) => {
  if(ms>0) return new Promise(resolve => setTimeout(() => resolve(true), ms))
  return Promise.resolve()
}


const main = async () => {
  await sequelize.sync()
  const w = new Worker(sequelize, workerId, verbose)
  await w.init()

  if(grimReaper) {
    while(true){
      await w.finalize()
      await waitForMs(2000)
    }
  }
  else{
    while(true){
      await enqueueAndSend(batchSize)
      await waitForMs(2000)
    }
  } 
}

main()


