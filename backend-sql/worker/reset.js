const { program } = require('commander')
const cmdParseInt = require('./util/cmd-parse-int')
program
  .requiredOption('-d, --database <uri>', 'database uri')
  .option('-c, --num-creds <creds>', 'number of credentials', cmdParseInt, 10)
  .option('-p, --num-campaigns <campaigns>', 'number of campaigns per credential', cmdParseInt, 2)
  .option('-w, --num-workers <workers>', 'number of workers', cmdParseInt, 3)
  .option('-r, --num-recipients <recipients>', 'number of recipients per campaign', cmdParseInt, 1000)
  .option('-j, --jobs', 'set flag to insert all jobs', false)
  .option('-i, --campaign-id <campaign-id>', 'insert a single job for this campaign. Overrides all other opts', cmdParseInt)
 
program.parse(process.argv)


/****** START ******/
const { Sequelize } = require('sequelize')
const fs = require('fs')
const path = require('path')
const { database, numCreds, numCampaigns, numWorkers, numRecipients, jobs, campaignId } = program.opts()
const sequelize = new Sequelize(
  database, {
    dialect: 'postgres',
    logging: false,
  })
const dbUtil = require('./util/db')(sequelize)

const main = async () => {
  if(campaignId){
    console.log(`Inserting job for campaignId=${campaignId}. Ignoring other parameters`)
    await dbUtil.insertJob(campaignId)
    return
  }
  else{
    console.log('Preparing the db')
    console.log(program.opts())
    await createFunctions()
    await dbUtil.truncateTables()
    await dbUtil.createUser()
    await dbUtil.createWorkers(numWorkers)
    await dbUtil.createCredentials(numCreds)
    await dbUtil.createCampaigns(numCampaigns, numCreds) // numCampaignsPerCredential
    await dbUtil.createTemplates(numCampaigns*numCreds)
    await dbUtil.createData(numRecipients, numCampaigns*numCreds)  //numRecipientsPerCampaign
    if(jobs){
      await dbUtil.insertJobs(numCampaigns*numCreds)
    }
  }
    

}

const createFunctions = () => {
  const functionDirPath = path.resolve(__dirname, '../sql/functions')
  const functionDir = fs.readdirSync(functionDirPath)
  return Promise.all(functionDir.map(sqlFile =>
    dbUtil.createFunctionFromFile(path.resolve(functionDirPath, sqlFile)))
  )
}

main()