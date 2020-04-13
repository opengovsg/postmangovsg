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

describe('Test 1', function () {
  let testWorker = null
  let dbUtil
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
  describe('db runner', () => {
    it('should contain 1 credential', async function () {
      const [rows] = await connection.query('SELECT COUNT(*) FROM credentials;')
      expect(rows[0].count).to.equal('1')
    })
    it('should contain 1 campaign', async function () {
      const [rows] = await connection.query('SELECT COUNT(*) FROM campaigns;')
      expect(rows[0].count).to.equal('1')
    })
    it('should contain 1 worker', async function () {
      const [rows] = await connection.query('SELECT COUNT(*) FROM workers;')
      expect(rows[0].count).to.equal('1')
    })
    it('should contain 10 messages to be sent', async function () {
      const [rows] = await connection.query('SELECT COUNT(*) FROM email_messages;')
      expect(rows[0].count).to.equal('10')
    })
    it('should contain 1 READY job', async function () {
        const [rows] = await connection.query('SELECT * FROM job_queue;')
        expect(rows.length).to.equal(1)
        expect(rows[0].status).to.equal('READY')
    })
  })
  describe('worker', () => {
    let currentJob = null
    let currentCampaign = null
    let currentMessages = null
    it('should pick up a job', async function () {
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
    it('should enqueue messages', async function () {
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
    it('should get messages to send', async function () {
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
    it('should send a message', async function () {
      await Promise.all(currentMessages.map(m => testWorker.sendMessage(m)))
      // Make sure delivered_at and message_id in ops table was set
      const [emailOps] = await connection.query('SELECT delivered_at, message_id FROM email_ops;')
      emailOps.forEach(emailOp => {
        expect(emailOp.delivered_at).to.not.be.null
        expect(emailOp.message_id).to.not.be.null
      })
    })
    it('should log messages back to ground truth', async function () {
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

describe('Test 2', function () {
  let testWorker = null
  let dbUtil
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
  describe('worker', () => {
    let currentJob = null
    let currentCampaign = null
    it('should stop a campaign', async function () {
      // Start a campaign
      const { jobId, campaignId } = await testWorker.getNextJob()
      currentJob = jobId
      currentCampaign = campaignId
      await testWorker.enqueueMessages(currentJob)
      const [emailOps] = await connection.query('SELECT campaign_id FROM email_ops;')
      expect(emailOps.length).to.equal(10)

      // Get some messages (5 out of 10)
      let messages = await testWorker.getMessages(currentJob, 5)
      expect(messages.length).to.equal(5)

      // Stop the job
      await dbUtil.stopJobs(campaignId)
      const jobs = await connection.query('SELECT * FROM job_queue WHERE campaign_id=:campaignId;',
        { replacements: { campaignId: currentCampaign }, type: QueryTypes.SELECT },
      )
      expect(jobs[0].status).to.equal('STOPPED')

      // Try to get messages - There should be none
      messages = await testWorker.getMessages(currentJob, 5)
      expect(messages.length).to.equal(0)
    })
    it('should finalize a stopped campaign', async function () {
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

        emailOp.delivered_at === null
        // Stopped message
          ? expect(message.delivered_at).to.be.null
        // Sent message
          : expect(message.delivered_at).to.equalDate(emailOp.delivered_at)

        expect(message.message_id).to.equal(emailOp.message_id)
        expect(message.error_code).to.equal(emailOp.error_code)
      })

      // Make sure email ops has been cleared
      const [emailOps] = await connection.query('SELECT campaign_id FROM email_ops;')
      expect(emailOps.length).to.equal(0)
    })
  })
})
