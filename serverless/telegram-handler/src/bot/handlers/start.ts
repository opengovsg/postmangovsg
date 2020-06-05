import { TelegrafContext } from 'telegraf/typings/context'
import { Message } from 'telegraf/typings/telegram-types'

import { Logger } from '../../utils/logger'

const logger = new Logger('start')

/**
 * Handles updates for the /start command.
 */
export const startCommandHandler = async (
  ctx: TelegrafContext
): Promise<Message> => {
  logger.log(ctx.from?.id.toString())

  const REPLY =
    'Hello! To complete the subscription, please send me your phone number by pressing the button below.'
  return ctx.reply(REPLY, {
    reply_markup: {
      keyboard: [[{ text: 'Send your phone number', request_contact: true }]],
    },
  })
}
