import { TelegrafContext } from 'telegraf/typings/context'
import { Message } from 'telegraf/typings/telegram-types'

import logger from '@core/logger'
import { generatePadding } from '../generate-padding'

/**
 * Handles updates for the /start command.
 */
export const startCommandHandler = async (
  ctx: TelegrafContext
): Promise<Message> => {
  logger.info(ctx.from?.id.toString() as string)

  const REPLY =
    'Hello! To complete the subscription, please send me your phone number by pressing the button below.'
  return ctx.reply(REPLY, {
    reply_markup: {
      keyboard: [
        [
          {
            // Refer to generatePadding for more details
            text: `Send your phone number ${generatePadding()}`,
            request_contact: true,
          },
        ],
      ],
    },
  })
}
