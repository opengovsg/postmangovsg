import { TelegrafContext } from 'telegraf/typings/context'
import { Message } from 'telegraf/typings/telegram-types'

import { Logger } from '../../utils/logger'

const logger = new Logger('help')

/**
 * Handles updates for the /help command.
 */
export const helpCommandHandler = async (
  ctx: TelegrafContext
): Promise<Message> => {
  logger.log(ctx.from?.id.toString())

  const REPLY = 'stub' // TODO: add copy
  return ctx.reply(REPLY)
}
