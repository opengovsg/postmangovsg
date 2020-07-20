import { fn, cast, Transaction, Op, QueryTypes } from 'sequelize'
import { Statistic, JobQueue, Campaign } from '@core/models'
import {
  CampaignStats,
  CampaignStatsCount,
  CampaignInvalidRecipient,
} from '@core/interfaces'
import { MessageStatus, ChannelType } from '@core/constants'
import logger from '@core/logger'

import bluebird from 'bluebird'

const getUnfinalisedCampaigns = async (): Promise<Array<number>> => {
  const result = await Statistic.sequelize?.query(`
      SELECT id FROM campaigns WHERE id NOT IN (
        SELECT DISTINCT(campaign_id) FROM email_messages
        WHERE
          updated_at::TIMESTAMP > (clock_timestamp() - '36 hours'::INTERVAL)
          AND status IS NOT NULL
      ) AND halted <> TRUE;`)
  return result?.[0].map((r: any) => r.id as number) || []
}

/**
 * Calls update_stats SQL function for respective channels.
 * fails silently
 * @param campaignId
 */
const updateStats = async (campaignId: number): Promise<void> => {
  const campaign = await Campaign.findOne({
    where: { id: campaignId },
  })
  if (!campaign) return

  logger.info(`updateStats invoked for campaign ${campaignId}`)

  switch (campaign.type) {
    case ChannelType.Email: {
      await Statistic.sequelize?.query(
        'SELECT update_stats_email(:campaign_id);',
        {
          replacements: { campaign_id: campaignId },
          type: QueryTypes.SELECT,
        }
      )
      break
    }
    case ChannelType.SMS: {
      await Statistic.sequelize?.query(
        'SELECT update_stats_sms(:campaign_id);',
        {
          replacements: { campaign_id: campaignId },
          type: QueryTypes.SELECT,
        }
      )
      break
    }
    case ChannelType.Telegram: {
      await Statistic.sequelize?.query(
        'SELECT update_stats_telegram(:campaign_id);',
        {
          replacements: { campaign_id: campaignId },
          type: QueryTypes.SELECT,
        }
      )
      break
    }
    default: {
      logger.error(`Invalid channel type found for campaign ${campaignId}`)
    }
  }
}

const consolidateStats = async (): Promise<void> => {
  const campaigns = await getUnfinalisedCampaigns()
  await bluebird.map(
    campaigns,
    (campaign) => {
      return updateStats(campaign)
    },
    {
      concurrency: 5,
    }
  )
}

/**
 * Helper method to get precomputed number of errored , sent, and unsent from statistic table.
 * Optional parameter to force retrieval of stats from respective messages tables.
 * @param campaignId
 * @param refresh optional
 */
const getStatsFromArchive = async (
  campaignId: number,
  refresh = false
): Promise<CampaignStatsCount> => {
  if (refresh) {
    await updateStats(campaignId)
  }
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
    updatedAt: stats?.updatedAt,
  }
}

/**
 * Return total count from statistic table
 * @param campaignId
 */
const getNumRecipients = async (campaignId: number): Promise<number> => {
  const { error, unsent, sent, invalid } = await getStatsFromArchive(campaignId)
  return error + unsent + sent + invalid
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
  opsTable: any,
  refresh = false
): Promise<CampaignStats> => {
  // Get job from job_queue table
  const job = await JobQueue.findOne({
    where: { campaignId },
    include: [
      {
        model: Campaign,
        attributes: ['halted'],
      },
    ],
  })

  if (job == null)
    throw new Error('Unable to find campaign in job queue table.')

  // Get stats from statistics table
  const archivedStats = await getStatsFromArchive(campaignId, refresh)

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
      updated_at: job.updatedAt,
      halted: job.campaign.halted,
    }
  }
  // else, return archived stats
  return {
    ...archivedStats,
    status: job.status,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    updated_at: archivedStats.updatedAt!,
    halted: job.campaign.halted,
  }
}

/*
 * Get total sent messages across all channels
 */
const getTotalSentCount = async (): Promise<number> => {
  return Statistic.sum('sent')
}

/**
 * Helper method to get sent_at, status and recipients for failed messages from logs table
 * @param campaignId
 * @param logsTable
 */
const getFailedRecipients = async (
  campaignId: number,
  logsTable: any
): Promise<Array<CampaignInvalidRecipient> | undefined> => {
  await updateStats(+campaignId)
  const data = await logsTable.findAll({
    raw: true,
    where: {
      campaignId,
      status: {
        [Op.or]: [MessageStatus.Error, MessageStatus.InvalidRecipient],
      },
    },
    attributes: ['recipient', 'status', 'error_code', 'updated_at'],
    useMaster: false,
  })

  return data
}

export const StatsService = {
  consolidateStats,
  getCurrentStats,
  getTotalSentCount,
  getNumRecipients,
  setNumRecipients,
  getFailedRecipients,
}
