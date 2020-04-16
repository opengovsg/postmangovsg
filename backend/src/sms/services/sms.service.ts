import { chunk } from 'lodash'
import { Campaign } from '@core/models'
import { SmsMessage, SmsTemplate } from '@sms/models'
import logger from '@core/logger'


const upsertSmsTemplate = async (body: string, campaignId: number): Promise<SmsTemplate> => {
  let transaction
  try {
    transaction = await SmsTemplate.sequelize?.transaction()
    // update
    if (await SmsTemplate.findByPk(campaignId, { transaction }) !== null) {
      // .update is actually a bulkUpdate
      const updatedTemplate: [number, SmsTemplate[]] = await SmsTemplate.update({
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
    const createdTemplate = await SmsTemplate.create({
      campaignId, body,
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
const populateSmsTemplate = async (campaignId: number, records: Array<object>): Promise<void> => {
  let transaction
  try {
    logger.info({ message: `Started populateSmsTemplate for ${campaignId}` })
    transaction = await SmsMessage.sequelize?.transaction()
    // delete message_logs entries
    await SmsMessage.destroy({
      where: { campaignId },
      transaction,
    })

    const chunks = chunk(records, 5000)
    for (let idx = 0; idx < chunks.length; idx++) {
      const batch = chunks[idx]
      await SmsMessage.bulkCreate(batch, { transaction })
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
    logger.info({ message: `Finished populateSmsTemplate for ${campaignId}` })
  } catch (err) {
    await transaction?.rollback()
    logger.error(`SmsMessage: destroy / bulkcreate failure. ${err.stack}`)
    throw new Error('SmsMessage: destroy / bulkcreate failure')
  }
}

export { populateSmsTemplate, upsertSmsTemplate }