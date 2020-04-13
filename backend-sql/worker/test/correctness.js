const chai = require('chai')
chai.use(require('chai-datetime'))
const expect = chai.expect
const { Sequelize, QueryTypes } = require('sequelize')
const connection = new Sequelize(
  'postgres://localhost:5432/testpostman',
  {
    dialect: 'postgres',
    logging: false,
  })
const dbRunner = require('../db/db-runner')
const Worker = require('../worker')

describe('Basic flow - one campaign, one credential', () => {
  let testWorker = null
  before(async () => {
    const dbConfig =
            {
              connection,
              dir: '../../sql/functions',
              numCreds: 1,
              numCampaigns: 1,
              numWorkers: 1,
              numRecipients: 10,
              jobs: true,
            }
    await dbRunner.start(dbConfig)
    testWorker = new Worker(connection, 1, false)
  })
  describe('db runner', () => {
    it('should contain 1 credential', async () => {
      const [rows] = await connection.query('SELECT COUNT(*) FROM credentials;')
      expect(rows[0].count).to.equal('1')
    })
    it('should contain 1 campaign', async () => {
      const [rows] = await connection.query('SELECT COUNT(*) FROM campaigns;')
      expect(rows[0].count).to.equal('1')
    })
    it('should contain 1 worker', async () => {
      const [rows] = await connection.query('SELECT COUNT(*) FROM workers;')
      expect(rows[0].count).to.equal('1')
    })
    it('should contain 10 messages to be sent', async () => {
      const [rows] = await connection.query('SELECT COUNT(*) FROM email_messages;')
      expect(rows[0].count).to.equal('10')
    })
    it('should contain 1 READY job', async () => {
      const [rows] = await connection.query('SELECT * FROM job_queue;')
      expect(rows.length).to.equal(1)
      expect(rows[0].status).to.equal('READY')
    })
  })
  describe('worker', () => {
    let currentJob = null
    let currentCampaign = null
    let currentMessages = null
    it('should pick up a job', async () => {
      const { jobId, campaignId } = await testWorker.getNextJob()
      expect(jobId).to.equal('1')
      expect(campaignId).to.equal('1')
      currentJob = parseInt(jobId)
      currentCampaign = parseInt(campaignId)
      const jobs = await connection.query('SELECT * FROM job_queue WHERE campaign_id=:campaignId;',
        { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
      )
      expect(jobs[0].status).to.equal('ENQUEUED')
      expect(jobs[0].worker_id).to.equal(testWorker.workerId)
    })
    it('should enqueue messages', async () => {
      await testWorker.enqueueMessages(currentJob)

      // Make sure status is changed to sending
      const jobs = await connection.query('SELECT * FROM job_queue WHERE campaign_id=:campaignId;',
        { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
      )
      expect(jobs[0].status).to.equal('SENDING')

      // Make sure dequeued_at in the ground truth table was set
      const emailMessages = await connection.query('SELECT dequeued_at FROM email_messages WHERE campaign_id=:campaignId;',
        { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
      )
      expect(emailMessages.length).to.equal(10)
      emailMessages.forEach(message => {
        expect(message.dequeued_at).to.not.be.null
      })

      // Make sure ops table has the messages that were enqueued
      const [emailOps] = await connection.query('SELECT campaign_id FROM email_ops;')
      expect(emailOps.length).to.equal(10)
      emailOps.forEach(emailOp => {
        expect(emailOp.campaign_id).to.equal(currentCampaign)
      })
    })
    it('should get messages to send', async () => {
      let messages = await testWorker.getMessages(currentJob, 10)
      expect(messages.length).to.equal(10)
      currentMessages = messages

      // Make sure sent_at in ops table was set
      const emailOps = await connection.query('SELECT sent_at FROM email_ops WHERE campaign_id=:campaignId;',
        { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
      )
      emailOps.forEach(emailOp => {
        expect(emailOp.sent_at).to.not.be.null
      })

      // Status should still be sending because it found messages
      const batchOne = await connection.query('SELECT * FROM job_queue WHERE campaign_id=:campaignId;',
        { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
      )
      expect(batchOne[0].status).to.equal('SENDING')

      messages = await testWorker.getMessages(currentJob, 10)
      expect(messages.length).to.equal(0)
      // Status should be SENT because it didnt find messages
      const batchTwo = await connection.query('SELECT * FROM job_queue WHERE campaign_id=:campaignId;',
        { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
      )
      expect(batchTwo[0].status).to.equal('SENT')
    })
    it('should send a message', async () => {
      await Promise.all(currentMessages.map(m => testWorker.sendMessage(m)))
      // Make sure delivered_at and message_id in ops table was set
      const [emailOps] = await connection.query('SELECT delivered_at, message_id FROM email_ops;')
      emailOps.forEach(emailOp => {
        expect(emailOp.delivered_at).to.not.be.null
        expect(emailOp.message_id).to.not.be.null
      })
    })
    it('should log messages back to ground truth', async () => {
      const [expectedUpdate] = await connection.query('SELECT recipient, delivered_at, message_id, error_code FROM email_ops;')
      await testWorker.finalize()

      // Make sure status is changed to LOGGED
      const jobs = await connection.query('SELECT * FROM job_queue WHERE campaign_id=:campaignId;',
        { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
      )
      expect(jobs[0].status).to.equal('LOGGED')

      // Make sure ground truth table has whatever was inside email_ops
      const emailMessages = await connection.query('SELECT recipient, delivered_at, message_id, error_code FROM email_messages WHERE campaign_id=:campaignId;',
        { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
      )
      emailMessages.forEach(message => {
        const emailOp = expectedUpdate.find(x => x.recipient === message.recipient)

        expect(message.delivered_at).to.equalDate(emailOp.delivered_at)
        expect(message.message_id).to.equal(emailOp.message_id)
        expect(message.error_code).to.equal(emailOp.error_code)
      })

      // Make sure email ops has been cleared
      const [emailOps] = await connection.query('SELECT campaign_id FROM email_ops;')
      expect(emailOps.length).to.equal(0)
    })
  })
})

describe('Stop and retry the same campaign', () => {
  let testWorker = null
  let dbUtil
  let currentJob = null
  let currentCampaign = null
  let messagesToSend = []
  before(async () => {
    dbUtil = require('../db/util/methods')(connection)
    const dbConfig =
            {
              connection,
              dir: '../../sql/functions',
              numCreds: 1,
              numCampaigns: 1,
              numWorkers: 1,
              numRecipients: 10,
              jobs: true,
            }
    await dbRunner.start(dbConfig)
    testWorker = new Worker(connection, 1, false)
  })

  it('should stop a campaign', async () => {
    // Start a campaign
    const { jobId, campaignId } = await testWorker.getNextJob()
    currentJob = parseInt(jobId)
    currentCampaign = parseInt(campaignId)
    await testWorker.enqueueMessages(currentJob)
    const [emailOps] = await connection.query('SELECT campaign_id FROM email_ops;')
    expect(emailOps.length).to.equal(10)

    // Get some messages (5 out of 10)
    messagesToSend = await testWorker.getMessages(currentJob, 5)
    expect(messagesToSend.length).to.equal(5)
    await Promise.all(messagesToSend.map(m => testWorker.sendMessage(m)))

    // Stop the job
    await dbUtil.stopJobs(campaignId)
    const jobs = await connection.query('SELECT * FROM job_queue WHERE campaign_id=:campaignId;',
      { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
    )
    expect(jobs[0].status).to.equal('STOPPED')

    // Try to get messages - There should be none
    const remainingMessages = await testWorker.getMessages(currentJob, 5)
    expect(remainingMessages.length).to.equal(0)
  })
  it('should finalize a stopped campaign', async () => {
    const [expectedUpdate] = await connection.query('SELECT recipient, delivered_at, message_id, error_code FROM email_ops;')
    await testWorker.finalize()

    // Make sure status is changed to LOGGED
    const jobs = await connection.query('SELECT * FROM job_queue WHERE campaign_id=:campaignId;',
      { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
    )
    expect(jobs[0].status).to.equal('LOGGED')

    // Make sure ground truth table has whatever was inside email_ops
    const emailMessages = await connection.query('SELECT recipient, delivered_at, message_id, error_code FROM email_messages WHERE campaign_id=:campaignId;',
      { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
    )

    emailMessages.forEach(message => {
      const emailOp = expectedUpdate.find(x => x.recipient === message.recipient)
      try {
        emailOp.delivered_at === null
        // Stopped message
          ? expect(message.delivered_at).to.be.null
        // Sent message
          : expect(message.delivered_at).to.equalDate(emailOp.delivered_at)
      } catch (err) {
        console.log(message, emailOp)
        throw err
      }

      expect(message.message_id).to.equal(emailOp.message_id)
      expect(message.error_code).to.equal(emailOp.error_code)
    })

    // Make sure email ops has been cleared
    const [emailOps] = await connection.query('SELECT campaign_id FROM email_ops;')
    expect(emailOps.length).to.equal(0)
  })

  it('should retry a campaign', async () => {
    await dbUtil.retryJobs(currentCampaign)
    await testWorker.getNextJob()
    // The same job should be enqueued
    const [rows] = await connection.query('SELECT id, campaign_id, status FROM job_queue;')
    expect(rows[0].id).to.equal(currentJob)
    expect(rows[0].campaign_id).to.equal(currentCampaign)
    expect(rows[0].status).to.equal('ENQUEUED')

    // It should enqueue the remaining 5 messages that did not get sent
    await testWorker.enqueueMessages(currentJob)
    const emailOps = await connection.query('SELECT sent_at FROM email_ops WHERE campaign_id=:campaignId;',
      { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
    )
    expect(emailOps.length).to.equal(5)

    // Check that the currently enqueued messages were not part of the messages that were sent
    const recipients = new Set(emailOps.map(emailOp => emailOp.recipient))
    expect(messagesToSend.every(({ recipient }) => !recipients.has(recipient))).to.be.true
  })
})

describe('Campaigns competing for the same credential', () => {
  const numWorkers = 2
  const numRecipients = 10
  let workers = []
  let dbUtil
  let currentCampaign = null
  before(async () => {
    dbUtil = require('../db/util/methods')(connection)
    const dbConfig =
              {
                connection,
                dir: '../../sql/functions',
                numCreds: 1,
                numCampaigns: 2, // 2 campaigns to compete for the same credential
                numWorkers: numWorkers,
                numRecipients: numRecipients,
                jobs: true,
              }
    await dbRunner.start(dbConfig)
    // Create 2 workers
    workers = Array(numWorkers).fill()
      .map((_j, i) => new Worker(connection, i + 1, false))
  })

  it('should have two jobs, with the same credential, for two different campaigns', async () => {
    const [jobs] = await connection.query(`SELECT q.campaign_id, q.status, p.cred_name from job_queue q, campaigns p 
        WHERE q.campaign_id = p.id ORDER BY q.campaign_id;`)
    expect(jobs.length).to.equal(2)
    expect(jobs[0].campaign_id).to.equal(1)
    expect(jobs[0].status).to.equal('READY')
    expect(jobs[1].campaign_id).to.equal(2)
    expect(jobs[1].status).to.equal('READY')
    expect(jobs[0].cred_name).to.equal(jobs[1].cred_name) // same credential
  })

  it('should disallow jobs with the same credential, but different campaign id, to start when one is already running', async () => {
    const { jobId, campaignId } = await workers[0].getNextJob()
    expect(jobId).to.equal('1')
    expect(campaignId).to.equal('1')
    currentCampaign = parseInt(campaignId)
    const { jobId: nextJob, campaignId: nextCampaign } = await workers[1].getNextJob()
    expect(nextJob).to.be.empty
    expect(nextCampaign).to.be.empty
  })

  it('should allow jobs with the same credential, but different campaign id, to start when the previous one has completed', async () => {
    await dbUtil.stopJobs(currentCampaign)
    await workers[0].finalize()
    const { jobId: nextJob, campaignId: nextCampaign } = await workers[1].getNextJob()
    expect(nextJob).to.equal('2')
    expect(nextCampaign).to.equal('2')
  })

  describe('Multiple jobs for same campaign id', async () => {
    const selectedCampaignId = 2
    const batchSize = 5
    let messages = []
    it('should allow jobs with the same credential, and the same campaign id, to start, even when another job for that campaign is already running', async () => {
      await dbUtil.insertJob(2) // Insert a second job for campaign 2
      const { jobId: nextJob, campaignId: nextCampaign } = await workers[0].getNextJob()
      expect(nextJob).to.equal('3')
      expect(nextCampaign).to.equal(String(selectedCampaignId))
    })
    it('should allow messages to be enqueued by multiple workers for different jobs with the same campaign id', async () => {
      await Promise.all([workers[0].enqueueMessages(2), workers[1].enqueueMessages(3)])
      const emailOps = await connection.query('SELECT recipient FROM email_ops WHERE campaign_id=:campaignId;',
        { replacements: { campaignId: selectedCampaignId }, type: QueryTypes.SELECT },
      )
      // Check that there are no duplicate recipients
      const uniqRecipients = new Set(emailOps.map(emailOp => emailOp.recipient))
      expect(uniqRecipients.size).to.equal(emailOps.length)
    })

    it('should allow messages to be retrieved by multiple workers for different jobs with the same campaign id', async () => {
      messages = await Promise.all([workers[0].getMessages(2, batchSize), workers[1].getMessages(3, batchSize)])
      expect(messages[0].length).to.equal(batchSize)
      expect(messages[1].length).to.equal(batchSize)
      // Expect that every recipient in workers[0] is different from worker[1]
      const recipients = new Set(messages[1].map(({ recipient }) => recipient))
      expect(messages[0].every(({ recipient }) => !recipients.has(recipient))).to.be.true
    })

    it('should finalize for the same campaign id if they are all sent', async () => {
      // Send the messages that were retrieved before
      await Promise.all(workers.map((worker, i) => {
        return Promise.all(messages[i].map(message => worker.sendMessage(message)))
      }))

      await workers[0].getMessages(2, batchSize) // There should be no more messages to send

      await workers[0].finalize()

      const jobs = await connection.query('SELECT * FROM job_queue WHERE campaign_id=:campaignId;',
        { replacements: { campaignId: selectedCampaignId }, type: QueryTypes.SELECT },
      )
      expect(jobs.length).to.equal(2)
      expect(jobs[0].status).to.equal('LOGGED')
      expect(jobs[1].status).to.equal('LOGGED')
    })
  })
})

describe('Campaigns with different credentials', () => {
  const numWorkers = 2
  let workers = []
  before(async () => {
    const dbConfig =
              {
                connection,
                dir: '../../sql/functions',
                numCreds: 2, // Two different credentials
                numCampaigns: 1, // One campaign for each credential
                numWorkers: numWorkers,
                numRecipients: 10,
                jobs: true,
              }
    await dbRunner.start(dbConfig)
    // Create 2 workers
    workers = Array(numWorkers).fill()
      .map((_j, i) => new Worker(connection, i + 1, false))
  })

  it('should have two jobs, with different credentials, for two different campaigns', async () => {
    const [jobs] = await connection.query(`SELECT q.campaign_id, q.status, p.cred_name from job_queue q, campaigns p 
        WHERE q.campaign_id = p.id ORDER BY q.campaign_id;`)
    expect(jobs.length).to.equal(2)
    expect(jobs[0].campaign_id).to.equal(1)
    expect(jobs[0].status).to.equal('READY')
    expect(jobs[1].campaign_id).to.equal(2)
    expect(jobs[1].status).to.equal('READY')
    expect(jobs[0].cred_name).to.not.equal(jobs[1].cred_name) // different credential
  })

  it('should allow campaigns with different credentials to start simultaneously', async () => {
    const { jobId, campaignId } = await workers[0].getNextJob()
    expect(jobId).to.equal('1')
    expect(campaignId).to.equal('1')
    const { jobId: nextJob, campaignId: nextCampaign } = await workers[1].getNextJob()
    expect(nextJob).to.equal('2')
    expect(nextCampaign).to.equal('2')
  })
})
