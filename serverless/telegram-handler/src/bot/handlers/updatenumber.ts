import { TelegrafContext } from 'telegraf/typings/context'
import { Message } from 'telegraf/typings/telegram-types'

/**
 * Handles updates for the /updatenumber command.
 * @param ctx Telegraf context
 */
export const updatenumberCommandHandler = async (
  ctx: TelegrafContext
): Promise<Message> => {
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
