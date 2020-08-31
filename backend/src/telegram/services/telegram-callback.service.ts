import { Update } from 'telegraf/typings/telegram-types'
const verifyBotIdRegistered = async (_botId: string): Promise<boolean> => {
  return true
}

const addSubscriber = async (
  botId: string,
  botToken: string,
  update: Update
): Promise<void> => {
  console.log(botId, botToken, update)
}
export const TelegramCallbackService = { verifyBotIdRegistered, addSubscriber }
