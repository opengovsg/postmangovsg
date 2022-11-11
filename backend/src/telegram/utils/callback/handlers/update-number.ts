import { TelegrafContext } from 'telegraf/typings/context'
import { Message } from 'telegraf/typings/telegram-types'

import { loggerWithLabel } from '@shared/core/logger'
import { generatePadding } from '../generate-padding'

const logger = loggerWithLabel(module)
/**
 * Handles updates for the /updatenumber command.
 */
export const updatenumberCommandHandler = async (
  ctx: TelegrafContext
): Promise<Message> => {
  logger.info({
    message: ctx.from?.id.toString() as string,
    action: 'updatenumberCommandHandler',
  })

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
