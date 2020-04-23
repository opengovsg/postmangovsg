import { chunk } from 'lodash'
import { Campaign, JobQueue } from '@core/models'
import { EmailMessage, EmailTemplate, EmailOp } from '@email/models'
import logger from '@core/logger'
import { CampaignStats } from '@core/interfaces'


const upsertEmailTemplate = async ({ subject, body, campaignId }: {subject: string; body: string; campaignId: number}): Promise<EmailTemplate> => {
  let transaction
  try {
    transaction = await EmailTemplate.sequelize?.transaction()
    // update
    if (await EmailTemplate.findByPk(campaignId, { transaction }) !== null) {
      // .update is actually a bulkUpdate
      const updatedTemplate: [number, EmailTemplate[]] = await EmailTemplate.update({
        subject,
        body,
      }, {
        where: { campaignId },
        individualHooks: true, // required so that BeforeUpdate hook runs
        returning: true,
        transaction,
      })

      transaction?.commit()
      return updatedTemplate[1][0]
    }
    // else create
    const createdTemplate = await EmailTemplate.create({
      campaignId, body, subject,
    }, {
      transaction,
    })

    transaction?.commit()
    return createdTemplate
  } catch (err) {
    transaction?.rollback()
    throw err
  }
}

/**
 * 1. delete existing entries
 * 2. bulk insert
 * 3. mark campaign as valid
 * steps 1- 3 are wrapped in txn. rollback if any fails
 * @param campaignId
 * @param records
 */
const populateEmailTemplate = async (campaignId: number, records: Array<object>): Promise<void> => {
  logger.info({ message: `Started populateEmailTemplate for ${campaignId}` })
  let transaction

  try {
    transaction = await EmailMessage.sequelize?.transaction()
    // delete message_logs entries
    await EmailMessage.destroy({
      where: { campaignId },
      transaction,
    })

    const chunks = chunk(records, 5000)
    for (let idx = 0; idx < chunks.length; idx++) {
      const batch = chunks[idx]
      await EmailMessage.bulkCreate(batch, { transaction })
    }

    await Campaign.update({
      valid: true,
    }, {
      where: {
        id: campaignId,
      },
      transaction,
    })
    await transaction?.commit()
    logger.info({ message: `Finished populateEmailTemplate for ${campaignId}` })
  } catch (err) {
    await transaction?.rollback()
    logger.error(`EmailMessage: destroy / bulkcreate failure. ${err.stack}`)
    throw new Error('EmailMessage: destroy / bulkcreate failure')
  }
}

  const getStatsFromTable = async (model: any, campaignId: string): Promise<{error: number, unsent: number, sent: number}> => {
    const error = await model.count({
      where: {campaign_id: campaignId},
      col: 'error_code'
    })
    const total = await model.count({
      where: {campaign_id: campaignId},
      col: 'id'
    })
    const sent = await model.count({
      where: {campaign_id: campaignId},
      col: 'sent_at'
    })

    const unsent = total - sent
    return { error, sent, unsent }
  }


const getEmailStats = async (campaignId: string): Promise<CampaignStats> => {
  const job = await JobQueue.findOne({ where: { campaignId } })
  if (job === null) throw new Error('Unable to find campaign in job queue table.')

  // Gets from email ops table if status is SENDING or SENT
  if (job.status === 'SENDING' || job.status === 'SENT') {
    const stats = await getStatsFromTable(EmailOp, campaignId) 
    return { error: stats.error, unsent: stats.unsent, sent: stats.sent, status: job.status }
  }

  const stats = await getStatsFromTable(EmailMessage, campaignId) 
  return { error: stats.error, unsent: stats.unsent, sent: stats.sent, status: job.status }
} 

export { populateEmailTemplate, upsertEmailTemplate, getEmailStats }