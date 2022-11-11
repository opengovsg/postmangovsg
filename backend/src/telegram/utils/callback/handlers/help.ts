import { TelegrafContext } from 'telegraf/typings/context'
import { Message } from 'telegraf/typings/telegram-types'

import { loggerWithLabel } from '@shared/core/logger'
import config from '@core/config'

const logger = loggerWithLabel(module)
const HELP_MESSAGE = `
*Commands*
/updatenumber - update your phone number
/help - show this help message

If you are experiencing issues with the Telegram bot, please contact us by submitting a [support form](${config.get(
  'telegramCallback.contactUsUrl'
)}) to the Postman team.

--
This bot is powered by Postman – a mass messaging platform used by the Government to communicate with stakeholders. For more information, please visit our [site](${config.get(
  'telegramCallback.guideUrl'
)}).
`

/**
 * Handles updates for the /help command.
 */
export const helpCommandHandler = async (
  ctx: TelegrafContext
): Promise<Message> => {
  logger.info({
    message: ctx.from?.id.toString() as string,
    action: 'helpCommandHandler',
  })

  return ctx.reply(HELP_MESSAGE, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  })
}
