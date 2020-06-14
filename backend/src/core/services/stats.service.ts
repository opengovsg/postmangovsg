import { fn, cast, Transaction } from 'sequelize'
import { Statistic, JobQueue } from '@core/models'
import { CampaignStats, CampaignStatsCount } from '@core/interfaces'

/**
 * Helper method to get precomputed number of errored , sent, and unsent from statistic table.
 * @param campaignId
 */
const getStatsFromArchive = async (
  campaignId: number
): Promise<CampaignStatsCount> => {
  const stats = await Statistic.findByPk(campaignId)
  if (!stats) {
    return {
      error: 0,
      sent: 0,
      unsent: 0,
      invalid: 0,
    }
  }
  return {
    error: stats?.errored,
    sent: stats?.sent,
    unsent: stats?.unsent,
    invalid: stats?.invalid,
  }
}

/**
 * Upsert unsent count to statistic table
 * @param campaignId
 * @param unsent
 * @param transaction optional
 */
const setNumRecipients = async (
  campaignId: number,
  unsent: number,
  transaction?: Transaction
): Promise<void> => {
  await Statistic.upsert(
    {
      campaignId,
      unsent,
      errored: 0,
      sent: 0,
      invalid: 0,
    },
    {
      transaction,
    }
  )
}

/**
 * Helper method to get the count of errored messages, sent messages, and messages that remain unsent from ops table.
 * @param campaignId
 * @param model
 */
const getStatsFromTable = async (
  campaignId: number,
  model: any
): Promise<CampaignStatsCount> => {
  // Retrieve stats from ops table
  const [data] = await model.findAll({
    raw: true,
    where: { campaignId },
    attributes: [
      [fn('sum', cast({ status: 'ERROR' }, 'int')), 'error'],
      [fn('sum', cast({ status: 'SENDING' }, 'int')), 'sent'],
      [fn('sum', cast({ status: null }, 'int')), 'unsent'],
      [fn('sum', cast({ status: 'INVALID_RECIPIENT' }, 'int')), 'invalid'],
    ],
  })

  return {
    error: +data.error,
    sent: +data.sent,
    unsent: +data.unsent,
    invalid: +data.invalid,
  }
}

/**
 * Helper method to get current count of errored , sent, and unsent depending on job status
 * @param campaignId
 * @param opsTable
 */
const getCurrentStats = async (
  campaignId: number,
  opsTable: any
): Promise<CampaignStats> => {
  // Get job from job_queue table
  const job = await JobQueue.findOne({ where: { campaignId } })
  if (job == null)
    throw new Error('Unable to find campaign in job queue table.')

  // Get stats from statistics table
  const archivedStats = await getStatsFromArchive(campaignId)

  // If job is sending, sent or stopped, i.e. not logged back to message table,
  // Retrieve current stats from ops table
  if (['SENDING', 'SENT', 'STOPPED'].includes(job.status)) {
    const opsStats = await getStatsFromTable(campaignId, opsTable)

    // Sent count must be added to archived sent count since sent messages are
    // not enqueued to ops table if a project is stopped and resumed
    // Since sent and invalid are not retried, they have to be added to archived stats
    return {
      error: opsStats.error,
      unsent: opsStats.unsent,
      sent: opsStats.sent + archivedStats.sent,
      // this is needed when invalid might appear in ops table, e.g. telegram immediate bounce errors
      invalid: opsStats.invalid + archivedStats.invalid,
      status: job.status,
    }
  }
  // else, return archived stats
  return { ...archivedStats, status: job.status }
}

/*
 * Get total sent messages across all channels
 */
const getTotalSentCount = async (): Promise<number> => {
  return Statistic.sum('sent')
}

export const StatsService = {
  getCurrentStats,
  getTotalSentCount,
  setNumRecipients,
}
