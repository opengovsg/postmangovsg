const Worker = require('./worker')

const enqueueAndSend = async (worker, batchSize) => {
    const { jobId, campaignId } = await worker.getNextJob()
    if(jobId){
      await worker.enqueueMessages(jobId)
      let hasNext = true
      while(hasNext){
        const messages = await worker.getMessages(jobId, batchSize)
        if(!messages[0]) {
          hasNext = false
        } else{
          const start = Date.now()
          await Promise.all(messages.map(m => worker.sendMessage(m)))
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


const start = async ({connection, workerId, grimReaper, verbose, batchSize }) => {
  const w = new Worker(connection, workerId, verbose)
  await w.init()

  if(grimReaper) {
    while(true){
      await w.finalize()
      await waitForMs(2000)
    }
  }
  else{
    while(true){
      await enqueueAndSend(w, batchSize)
      await waitForMs(2000)
    }
  } 
}

module.exports = { start }