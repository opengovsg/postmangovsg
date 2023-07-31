import config from '@core/config'
import {
  GovsgMessageStatus,
  Ordering,
  TimestampFilter,
  TransactionalGovsgSortField,
} from '@core/constants'
import {
  ApiAuthenticationError,
  ApiInvalidRecipientError,
  ApiRateLimitError,
} from '@core/errors/rest-api.errors'
import { loggerWithLabel } from '@core/logger'
import { whatsappService } from '@core/services/whatsapp.service'
import { GovsgMessageTransactional } from '@govsg/models'
import {
  AuthenticationError,
  InvalidRecipientError,
  RateLimitError,
} from '@shared/clients/whatsapp-client.class/errors'
import {
  MessageId,
  NormalisedParam,
  WhatsAppApiClient,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/types'
import { Op } from 'sequelize'
import { Order, WhereOptions } from 'sequelize'

const logger = loggerWithLabel(module)

export async function sendMessage({
  recipient,
  templateName,
  params,
  languageCode,
}: {
  recipient: string
  templateName: string
  params: NormalisedParam[]
  languageCode: WhatsAppLanguages
}): Promise<MessageId> {
  const action = 'sendMessage'
  logger.info({ message: 'Sending GovSG message', action })
  /*   Overview of sending logic
  1. DB models to query flamingo db to decide which API client to use
  2. Call WhatsApp contacts endpoint to validate user
  3. Send templated message to user
  */
  const apiClientIdMap = await whatsappService.flamingoDbClient.getApiClientId([
    recipient,
  ])
  const messageToSend = {
    recipient,
    templateName,
    params,
    // if recipient not in db, map.get(recipient) will return undefined
    // default to clientTwo in this case
    apiClient: apiClientIdMap.get(recipient) ?? WhatsAppApiClient.clientTwo,
    language: languageCode,
  }
  // differential treatment based on local vs staging/prod
  // because WA API Client is inaccessible from local
  const isLocal = config.get('env') === 'development'
  try {
    const messageId = await whatsappService.whatsappClient.sendTemplateMessage(
      messageToSend,
      isLocal
    )
    return messageId
  } catch (err) {
    if (err instanceof AuthenticationError) {
      throw new ApiAuthenticationError(err.message)
    }
    if (err instanceof RateLimitError) {
      throw new ApiRateLimitError(err.message)
    }
    if (err instanceof InvalidRecipientError) {
      throw new ApiInvalidRecipientError(
        err.message + `. Recipient: ${recipient}`
      )
    }
    logger.error({
      message: 'Error sending message',
      action,
      error: err,
    })
    throw err
  }
}

export async function listMessages({
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
  sortBy?: TransactionalGovsgSortField
  orderBy?: Ordering
  status?: GovsgMessageStatus
  filterByTimestamp?: TimestampFilter
}): Promise<{ hasMore: boolean; messages: GovsgMessageTransactional[] }> {
  limit = limit || 10
  offset = offset || 0
  sortBy = sortBy || TransactionalGovsgSortField.Created
  orderBy = orderBy || Ordering.DESC
  const order: Order = [[sortBy, orderBy]]
  const where: WhereOptions = { userId }
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
  const { count, rows } = await GovsgMessageTransactional.findAndCountAll({
    limit,
    offset,
    where,
    order,
  })
  return {
    hasMore: count > offset + limit,
    messages: rows,
  }
}
