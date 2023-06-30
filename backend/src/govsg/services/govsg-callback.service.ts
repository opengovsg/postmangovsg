import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import {
  UserMessageWebhook,
  WhatsAppTemplateMessageWebhook,
} from '@shared/clients/whatsapp-client.class/types'
import { UnexpectedWebhookError } from '@shared/clients/whatsapp-client.class/errors'
import { GovsgMessage, GovsgMessageTransactional } from '@govsg/models'
import { GovsgMessageStatus, govsgMessageStatusMapper } from '@core/constants'

const logger = loggerWithLabel(module)

const isAuthenticated = (token: string): boolean => {
  const verifyToken = config.get('whatsapp.callbackVerifyToken')
  return token === verifyToken
}

const parseWebhook = async (body: unknown): Promise<void> => {
  const action = 'parseWebhook'
  logger.info({
    message: 'Received webhook from WhatsApp',
    action,
  })
  // based on current setup, we expect the shape of body to be either
  // WhatsAppTemplateMessageWebhook or UserMessageWebhook
  // if it's neither, we should thrown an error
  // ideally, should do full validation of the body using sth like Zod
  if (!body || typeof body !== 'object') {
    logger.error({
      message: 'Unexpected webhook body',
      action,
      body,
    })
    throw new UnexpectedWebhookError('Unexpected webhook body')
  }
  if ('statuses' in body) {
    // can delete this after we verified that it all works
    logger.info({
      message: 'Received status webhook from WhatsApp',
      action,
    })
    await parseTemplateMessageWebhook(body as WhatsAppTemplateMessageWebhook)
    return
  }
  if ('messages' in body && 'contacts' in body) {
    // can delete this after we verified that it all works
    logger.info({
      message: 'Received message webhook from WhatsApp',
      action,
    })
    await parseUserMessageWebhook(body as UserMessageWebhook)
    return
  }
  // body is an object but doesn't have the expected keys
  logger.error({
    message: 'Unexpected webhook body',
    action,
    body,
  })
  throw new UnexpectedWebhookError('Unexpected webhook body')
}

const parseTemplateMessageWebhook = async (
  body: WhatsAppTemplateMessageWebhook
): Promise<void> => {
  const { id: messageId } = body.statuses[0]
  const [isGovsgMessage, isGovsgMessageTransactional] = await Promise.all([
    GovsgMessage.findOne({ where: { serviceProviderMessageId: messageId } }),
    GovsgMessageTransactional.findOne({
      where: { serviceProviderMessageId: messageId },
    }),
  ])
  if (!isGovsgMessage && !isGovsgMessageTransactional) {
    logger.info({
      message:
        'Received webhook for message not in GovsgMessage or GovsgMessageTransactional',
      meta: {
        messageId,
      },
    })
    // no match found, assume it's a Standard Reply webhook, safe to ignore
    return
  }
  if (isGovsgMessage && isGovsgMessageTransactional) {
    logger.error({
      message: 'Received webhook for message that exists in both tables',
      meta: {
        messageId,
      },
    })
    throw new UnexpectedWebhookError(
      'Received webhook for message that exists in both tables'
    )
  }
  const whatsappStatus = body.statuses[0].status
  const status = govsgMessageStatusMapper(whatsappStatus)
  if (status === null) {
    logger.warn({
      message: 'Received webhook with warning status',
      meta: {
        messageId,
        body,
      },
    })
    // no corresponding status to update
    return
  }
  if (
    status === GovsgMessageStatus.Error &&
    body.errors &&
    body.errors.length > 0
  ) {
    // not sure if we need to use logger.info or logger.warn here
    const { code, title, details, href } = body.errors[0]
    const errorCode = code.toString()
    const errorDescription = `${title} ${details} ${href}`
    if (isGovsgMessage) {
      await isGovsgMessage.update(
        {
          status,
          errorCode,
          errorDescription,
        },
        {
          where: {
            serviceProviderMessageId: messageId,
          },
        }
      )
    }
    if (isGovsgMessageTransactional) {
      await isGovsgMessageTransactional.update(
        {
          status,
          errorCode,
          errorDescription,
        },
        {
          where: {
            serviceProviderMessageId: messageId,
          },
        }
      )
    }
  }
  if (isGovsgMessage) {
    await isGovsgMessage.update(
      {
        status,
      },
      {
        where: {
          serviceProviderMessageId: messageId,
        },
      }
    )
  }
  if (isGovsgMessageTransactional) {
    await isGovsgMessageTransactional.update(
      {
        status,
      },
      {
        where: {
          serviceProviderMessageId: messageId,
        },
      }
    )
  }
}

const parseUserMessageWebhook = async (
  body: UserMessageWebhook
): Promise<void> => {
  const { wa_id: whatsappId } = body.contacts[0]
  const { id: messageId } = body.messages[0]
  // todo
  console.log(whatsappId, messageId)
}

export const GovsgCallbackService = { isAuthenticated, parseWebhook }
