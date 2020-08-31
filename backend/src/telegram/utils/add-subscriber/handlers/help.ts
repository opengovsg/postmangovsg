import { TelegrafContext } from 'telegraf/typings/context'
import { Message } from 'telegraf/typings/telegram-types'

import logger from '@core/logger'
import config from '@core/config'

const HELP_MESSAGE = `
*Commands*
/updatenumber - update your phone number
/help - show this help message

If you are experiencing issues with the Telegram bot, please contact us by submitting a [support form](${config.get(
  'telegramAddSubscriber.contactUsUrl'
)}) to the Postman team.

--
This bot is powered by Postman – a mass messaging platform used by the Government to communicate with stakeholders. For more information, please visit our [site](${config.get(
  'telegramAddSubscriber.guideUrl'
)}).
`

/**
 * Handles updates for the /help command.
 */
export const helpCommandHandler = async (
  ctx: TelegrafContext
): Promise<Message> => {
  logger.info(ctx.from?.id.toString() as string)

  return ctx.reply(HELP_MESSAGE, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  })
}
