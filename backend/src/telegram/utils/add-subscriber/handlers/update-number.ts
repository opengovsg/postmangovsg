import { TelegrafContext } from 'telegraf/typings/context'
import { Message } from 'telegraf/typings/telegram-types'

import logger from '@core/logger'
import { generatePadding } from '../generate-padding'

/**
 * Handles updates for the /updatenumber command.
 */
export const updatenumberCommandHandler = async (
  ctx: TelegrafContext
): Promise<Message> => {
  logger.info(ctx.from?.id.toString() as string)

  const REPLY =
    'Please send me your updated phone number by pressing the button below.'
  return ctx.reply(REPLY, {
    reply_markup: {
      keyboard: [
        [
          {
            // Refer to generatePadding for more details
            text: `Send your updated phone number ${generatePadding()}`,
            request_contact: true,
          },
        ],
      ],
    },
  })
}
