const fs = require('fs')
let sequelize = null
const truncateTables = () => {
  console.log('Truncating tables')
  return sequelize.query(
    `TRUNCATE users, job_queue, credentials, campaigns, workers,
        email_messages, email_templates, email_ops RESTART IDENTITY;`,
  )
}

const createUser = () => {
  console.log('Creating user')
  return sequelize.query(
    `INSERT INTO users ("id", "email","created_at", "updated_at") VALUES 
        (1, 'test@test.gov.sg', clock_timestamp(), clock_timestamp());`,
  )
}

const createCredentials = (numCredentials) => {
  console.log(`Creating ${numCredentials} credentials`)
  return sequelize.query(`INSERT INTO credentials ("name", "used", "created_at", "updated_at")
    SELECT concat('CRED-',generate_series(1, ${numCredentials})),FALSE,clock_timestamp(), clock_timestamp();`)
}

const createCampaigns = (numCampaignsPerCredential, numCredentials) => {
  console.log(`Creating ${numCampaignsPerCredential} campaigns per credential, 
    for a total of ${numCampaignsPerCredential * numCredentials} campaigns`)
  return sequelize.query(`
    INSERT INTO campaigns ("id", "name", "user_id", "type", "cred_name", "valid", "created_at", "updated_at" ) 
    SELECT ROW_NUMBER () OVER (ORDER BY name) as id,  t.name, t.user_id, enum_campaigns_type(t.type), t.cred_name, t.valid, t.created_at, t.updated_at 
    FROM  generate_series(1,${numCredentials}) num_credentials
    CROSS JOIN LATERAL ( 
    SELECT generate_series(1,${numCampaignsPerCredential}) as num_campaign, 'email-campaign' as name, 1 as user_id, 'EMAIL' as type, concat('CRED-', num_credentials) as cred_name, TRUE as valid, 
    clock_timestamp() as created_at, clock_timestamp() as updated_at
    ) t;
 `)
}

const createTemplates = (numCampaigns) => {
  console.log(`Creating ${numCampaigns} templates`)
  return sequelize.query(`
    INSERT INTO email_templates ("campaign_id", "body", "subject", "created_at", "updated_at")
    SELECT generate_series(1,${numCampaigns}), 'body' as body, 'subject', clock_timestamp(), clock_timestamp();
    `)
}

const createWorkers = (numWorkers) => {
  console.log(`Creating ${numWorkers} workers`)
  return sequelize.query(`
    INSERT INTO workers ("id",  "created_at", "updated_at") 
    SELECT generate_series(1,${numWorkers}) as id, clock_timestamp() as created_at, clock_timestamp() as updated_at;
    `)
}

const createData = (numRecipients, numCampaigns) => {
  console.log(`Creating ${numRecipients} recipients per campaign, 
    for a total of ${numRecipients * numCampaigns} recipients`)
  return sequelize.query(`
    INSERT INTO email_messages ("campaign_id", "recipient", "params", "created_at", "updated_at")
    SELECT t.* FROM  generate_series(1,${numRecipients}) num_recipient
    CROSS JOIN LATERAL ( 
    SELECT generate_series(1,${numCampaigns}) as "campaign_id", concat(num_recipient, 'test@test.gov.sg') as "recipient", CAST('{}' AS json) as "params",clock_timestamp() as "created_at", clock_timestamp() as "updated_at" 
    ) t;
    `)
}

const insertJobs = (numCampaigns) => {
  console.log(`Creating ${numCampaigns} jobs`)
  return sequelize.query(
    `INSERT INTO job_queue ("campaign_id", "send_rate", "status", "created_at", "updated_at")
    SELECT generate_series(1,${numCampaigns}), 100 as send_rate, 'READY' as status, clock_timestamp() as created_at, clock_timestamp() as updated_at;
    `,
  )
}

const insertJob = (campaignId) => {
  console.log(`Creating one job for campaignId ${campaignId}`)
  return sequelize.query(
    `INSERT INTO job_queue ("campaign_id", "send_rate", "status", "created_at", "updated_at")
        VALUES (${campaignId}, 100, 'READY', clock_timestamp(), clock_timestamp());
        `,
  )
}

const stopJobs = (campaignId) => {
  console.log(`Stopping jobs for campaignId ${campaignId}`)
  return sequelize.query(
    `UPDATE job_queue SET status = 'STOPPED' WHERE campaign_id = ${campaignId} AND status <> 'LOGGED';`,
  )
}

const retryJobs = (campaignId) => {
  console.log(`Retrying jobs for campaignId ${campaignId}`)
  return sequelize.query(
    `UPDATE job_queue SET status = 'READY' WHERE campaign_id = ${campaignId} AND
    NOT EXISTS (
      -- Check that all of the jobs have been logged for this campaign id
      SELECT 1 FROM job_queue q WHERE q.campaign_id = ${campaignId} AND status <> 'LOGGED' LIMIT 1
    );
    `,
  )
}

const createFunctionFromFile = (filePath) => {
  return new Promise((resolve, reject) => {
    console.log('Creating functions from' + filePath)
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  }).then((data) => {
    return sequelize.query(data)
  })
}

module.exports = (connection) => {
  sequelize = connection
  return {
    truncateTables,
    createUser,
    createCredentials,
    createCampaigns,
    createTemplates,
    createWorkers,
    createData,
    createFunctionFromFile,
    insertJobs,
    insertJob,
    stopJobs,
    retryJobs,
  }
}
