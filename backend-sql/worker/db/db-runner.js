
const fs = require('fs')
const path = require('path')
const start = async ({ connection, dir, numCreds, numCampaigns, numWorkers, numRecipients, jobs }) =>{
    const dbUtil = require('./util/methods')(connection)
    const createFunctions = () => {
        const functionDirPath = path.resolve(__dirname, dir)
        const functionDir = fs.readdirSync(functionDirPath)
        return Promise.all(functionDir.map(sqlFile =>
          dbUtil.createFunctionFromFile(path.resolve(functionDirPath, sqlFile)))
        )
    }

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

module.exports = { start }