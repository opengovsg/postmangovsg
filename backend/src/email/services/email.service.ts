import { chunk } from 'lodash'

import { Campaign } from '@core/models'
import logger from '@core/logger'
import { EmailMessage, EmailTemplate } from '@email/models'

const upsertEmailTemplate = async ({subject, body, campaignId}: {subject: string, body: string, campaignId: number}): Promise<EmailTemplate> => {
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
const populateEmailTemplate = async (campaignId: number, records: Array<object>) => {
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
    throw new Error(`EmailMessage: destroy / bulkcreate failure`)
  }
}

export { populateEmailTemplate, upsertEmailTemplate }