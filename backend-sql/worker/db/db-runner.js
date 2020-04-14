
const fs = require('fs')
const path = require('path')
const start = async ({ connection, dir, numEmailCreds, numSmsCreds, numCampaigns, numWorkers, numRecipients, jobs }) => {
  const dbUtil = require('./util/methods')(connection)
  const createFunctions = async () => {
    const functionDirPath = path.resolve(__dirname, dir)
    const functionDir = fs.readdirSync(functionDirPath)
    functionDir.forEach(async sqlFile => {
      await dbUtil.createFunctionFromFile(path.resolve(functionDirPath, sqlFile))
    })
  }

  await createFunctions()
  await dbUtil.truncateTables()
  await dbUtil.createUser()
  await dbUtil.createWorkers(numWorkers)
  await dbUtil.createCredentials(numEmailCreds, numSmsCreds)
  await dbUtil.createCampaigns(numCampaigns, numEmailCreds, numSmsCreds) // numCampaignsPerCredential
  await dbUtil.createTemplates(numCampaigns, numEmailCreds, numSmsCreds)
  await dbUtil.createData(numRecipients, numCampaigns, numEmailCreds, numSmsCreds)// numRecipientsPerCampaign
  if (jobs) {
    await dbUtil.insertJobs(numCampaigns * ( numEmailCreds + numSmsCreds ))
  }
}

module.exports = { start }
