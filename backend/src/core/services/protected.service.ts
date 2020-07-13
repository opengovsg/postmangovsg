import url from 'url'
import { Transaction } from 'sequelize'
import { TemplateClient } from 'postman-templating'

import config from '@core/config'
import logger from '@core/logger'
import { ProtectedMessage, Campaign } from '@core/models'

const PROTECT_METHOD_VERSION = 1

const templateClient = new TemplateClient()
/**
 * Whether a campaign is protected or not
 */
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
    for (let i = 0; i < protectedMessages.length; i += batchSize) {
      const batch = protectedMessages
        .slice(i, i + batchSize)
        .map((row) => ({ ...row, version: PROTECT_METHOD_VERSION }))
      await ProtectedMessage.bulkCreate(batch, { transaction })
    }

    // Map to message format
    return protectedMessages.map(({ campaignId, recipient, id }) => ({
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
/**
 * Verifies that the template for protected campaigns has the compulsory keywords
 */
const checkTemplateVariables = (body: string): void => {
  const { variables } = templateClient.parseTemplate(body)

  const essential = ['protectedlink']

  const missing = essential.filter((keyword) => !variables.includes(keyword))

  if (missing.length !== 0) {
    throw new Error(
      `Compulsory keywords are missing from the template: ${missing}`
    )
  }

  if (variables.length !== essential.length) {
    throw new Error(
      `Only 'protectedlink' is allowed as a keyword in the template.`
    )
  }
}

/**
 * Get corresponding payload for given message id and password hash
 * @param id
 * @param passwordHash
 */
const getProtectedMessage = async (
  id: string,
  passwordHash: string
): Promise<ProtectedMessage | null> => {
  const protectedMsg = await ProtectedMessage.findOne({
    where: { id, passwordHash },
    attributes: ['payload'],
  })
  return protectedMsg
}

export const ProtectedService = {
  isProtectedCampaign,
  checkTemplateVariables,
  storeProtectedMessages,
  getProtectedMessage,
}
