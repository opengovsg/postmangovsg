import { TelegrafContext } from 'telegraf/typings/context'
import { Message } from 'telegraf/typings/telegram-types'

import { Logger } from '../../utils/logger'

const logger = new Logger('updatenumber')

/**
 * Handles updates for the /updatenumber command.
 */
export const updatenumberCommandHandler = async (
  ctx: TelegrafContext
): Promise<Message> => {
  logger.log(ctx.from?.id.toString())

  const REPLY =
    'Please send me your updated phone number by pressing the button below.'
  return ctx.reply(REPLY, {
    reply_markup: {
      keyboard: [
        [{ text: 'Send your updated phone number', request_contact: true }],
      ],
    },
  })
}
