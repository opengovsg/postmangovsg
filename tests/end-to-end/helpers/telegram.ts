import { sequelize } from './database'
import { QueryTypes } from 'sequelize'

/**
 * Add a new subscriber. If the subscriber already exists, does nothing
 * @param telegramId
 * @param phoneNumber
 * @param botId
 */
export const addTelegramSubscriber = async (
  telegramId: number,
  phoneNumber: string,
  botId: number
): Promise<void> => {
  const transaction = await sequelize.transaction()
  try {
    await sequelize.query(
      `
        INSERT INTO telegram_subscribers (phone_number, telegram_id, created_at, updated_at)
        VALUES (:phoneNumber, :telegramId, clock_timestamp(), clock_timestamp())
        ON CONFLICT DO NOTHING
      `,
      {
        transaction,
        type: QueryTypes.INSERT,
        replacements: { phoneNumber, telegramId },
      }
    )

    await sequelize.query(
      `
        INSERT INTO bot_subscribers (bot_id, telegram_id, created_at, updated_at)
        VALUES (:botId, :telegramId, clock_timestamp(), clock_timestamp())
        ON CONFLICT DO NOTHING
      `,
      {
        transaction,
        type: QueryTypes.INSERT,
        replacements: { botId, telegramId },
      }
    )
    await transaction.commit()
  } catch (err) {
    await transaction.rollback()
  }
}
