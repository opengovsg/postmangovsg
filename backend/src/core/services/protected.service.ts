import { difference } from 'lodash'
import { Transaction } from 'sequelize'
import { TemplateClient, XSS_EMAIL_OPTION } from 'postman-templating'

import config from '@core/config'
import logger from '@core/logger'
import { ProtectedMessage, Campaign } from '@core/models'

const PROTECTED_URL = config.get('protectedUrl')
const PROTECT_METHOD_VERSION = 1

const templateClient = new TemplateClient(XSS_EMAIL_OPTION)
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
        protectedlink: `${PROTECTED_URL}/${PROTECT_METHOD_VERSION}/${id}`,
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
 * Verifies that the template for protected campaigns has the required and optional keywords.
 */
const checkTemplateVariables = (
  template: string,
  required: string[],
  optional: string[]
): void => {
  const { variables } = templateClient.parseTemplate(template)

  const missing = difference(required, variables)

  // Makes sure that all the required keywords are inside the template
  if (missing.length !== 0) {
    throw new Error(
      `Required keywords are missing from the template: ${missing}`
    )
  }

  const whitelist = [...required, ...optional]
  const forbidden = difference(variables, whitelist)
  // Should only contain the whitelisted keywords
  if (forbidden.length > 0) {
    throw new Error(
      `Only these keywords are allowed: ${whitelist}.\nRemove the other keywords from the template: ${forbidden}`
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
