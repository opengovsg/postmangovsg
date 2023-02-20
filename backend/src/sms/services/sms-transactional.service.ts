import { TemplateError } from '@shared/templating'
import { SmsService, SmsTemplateService } from '@sms/services'
import { loggerWithLabel } from '@core/logger'
import {
  Ordering,
  TimestampFilter,
  TransactionalEmailSortField,
} from '@core/constants'
import { TransactionalEmailMessageStatus } from '@email/models'
import { SmsMessageTransactional } from '@sms/models'
import { Order } from 'sequelize/types/model'
import { Op, WhereOptions } from 'sequelize'
import { TwilioCredentials } from '@shared/clients/twilio-client.class'
import config from '@core/config'

const logger = loggerWithLabel(module)

/**
 * Sanitizes an SMS message and sends it.
 * @throws TemplateError if the body is invalid
 * @throws Error if the message could not be sent
 */
async function sendMessage({
  credentials,
  body,
  recipient,
}: {
  credentials: TwilioCredentials
  body: string
  recipient: string
}): Promise<string | void> {
  const sanitizedBody =
    SmsTemplateService.client.replaceNewLinesAndSanitize(body)
  if (!sanitizedBody) {
    throw new TemplateError(
      'Message is invalid as it only contains invalid HTML tags.'
    )
  }

  logger.info({
    message: 'Sending transactional SMS (service)',
    action: 'sendMessage',
  })

  // append the config callback info into credentials here
  credentials.callbackSecret = config.get('smsCallback.callbackSecret')
  credentials.callbackBaseUrl = config.get('smsCallback.callbackUrl')
  return await SmsService.sendMessage(credentials, recipient, sanitizedBody)
}

async function listMessages({
  userId,
  limit,
  offset,
  sortBy,
  orderBy,
  status,
  filterByTimestamp,
}: {
  userId: string
  limit?: number
  offset?: number
  sortBy?: TransactionalEmailSortField
  orderBy?: Ordering
  status?: TransactionalEmailMessageStatus
  filterByTimestamp?: TimestampFilter
}): Promise<{ hasMore: boolean; messages: SmsMessageTransactional[] }> {
  limit = limit || 10
  offset = offset || 0
  sortBy = sortBy || TransactionalEmailSortField.Created
  orderBy = orderBy || Ordering.DESC
  const order: Order = [[sortBy, orderBy]]
  const where = ((userId, status, filterByTimestamp) => {
    const where: WhereOptions = { userId } // pre-fill with userId for authentication
    if (status) {
      where.status = status
    }
    if (filterByTimestamp) {
      if (filterByTimestamp.createdAt) {
        const { gt, gte, lt, lte } = filterByTimestamp.createdAt
        if (gt) {
          where.createdAt = { ...where.createdAt, [Op.gt]: gt }
        }
        if (gte) {
          where.createdAt = { ...where.createdAt, [Op.gte]: gte }
        }
        if (lt) {
          where.createdAt = { ...where.createdAt, [Op.lt]: lt }
        }
        if (lte) {
          where.createdAt = { ...where.createdAt, [Op.lte]: lte }
        }
      }
    }
    return where
  })(userId, status, filterByTimestamp)
  const { count, rows } = await SmsMessageTransactional.findAndCountAll({
    limit,
    offset,
    where,
    order,
  })
  const hasMore = count > offset + limit
  return { hasMore, messages: rows }
}

export const SmsTransactionalService = {
  sendMessage,
  listMessages,
}
