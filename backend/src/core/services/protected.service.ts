import { v4 as uuid } from 'uuid'
import url from 'url'

import config from '@core/config'
import logger from '@core/logger'

import { ProtectedMessage, Campaign } from '@core/models'
import { Transaction } from 'sequelize'

const isProtectedCampaign = async (campaignId: number): Promise<boolean> => {
  return !!(await Campaign.findOne({
    where: {
      id: campaignId,
      protect: true,
    },
  }))
}

const storeProtectedMessages = async (
  campaignId: number,
  protectedMessages: ProtectedMessageRecordInterface[],
  transaction?: Transaction
): Promise<MessageBulkInsertInterface[]> => {
  const frontendUrl = config.get('frontendUrl')
  const protectedPath = config.get('protectedPath')

  // Generate unique id for each message
  const messagesToStore = protectedMessages.map((message) => ({
    ...message,
    id: uuid(),
  }))

  try {
    // Delete existing rows
    await ProtectedMessage.destroy({
      where: {
        campaignId,
      },
      transaction,
    })

    // Insert new rows
    const batchSize = 5000
    for (let i = 0; i < messagesToStore.length; i += batchSize) {
      const batch = messagesToStore.slice(i, i + batchSize)
      await ProtectedMessage.bulkCreate(batch, { transaction })
    }

    // Map to message format
    return messagesToStore.map(({ campaignId, recipient, id }) => ({
      campaignId,
      recipient,
      params: {
        recipient,
        protectedlink: url.resolve(frontendUrl, `${protectedPath}/${id}`),
      },
    }))
  } catch (e) {
    transaction?.rollback()
    logger.error(
      `Error storing protected payloads for campaign ${campaignId}: ${e}`
    )
    throw e
  }
}

export const ProtectedService = { isProtectedCampaign, storeProtectedMessages }
