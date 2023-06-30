import config from '@core/config'
import validator from 'validator'
import { loggerWithLabel } from '@core/logger'
import {
  UserMessageWebhook,
  WhatsAppApiClient,
  WhatsAppId,
  WhatsAppLanguages,
  WhatsAppTemplateMessageToSend,
  WhatsAppTemplateMessageWebhook,
  WhatsAppTextMessageToSend,
  WhatsAppWebhookTextMessage,
  WhatsappWebhookMessageType,
} from '@shared/clients/whatsapp-client.class/types'
import { UnexpectedWebhookError } from '@shared/clients/whatsapp-client.class/errors'
import { GovsgMessage, GovsgMessageTransactional } from '@govsg/models'
import { GovsgMessageStatus, govsgMessageStatusMapper } from '@core/constants'
import { WhatsAppService } from '@core/services'

const logger = loggerWithLabel(module)

const isAuthenticated = (token: string): boolean => {
  const verifyToken = config.get('whatsapp.callbackVerifyToken')
  return token === verifyToken
}

const parseWebhook = async (
  body: unknown,
  clientId: WhatsAppApiClient
): Promise<void> => {
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
    await parseUserMessageWebhook(body as UserMessageWebhook, clientId)
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
    const errorDescription = `${title} Details: ${details} href: ${href}`
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
  body: UserMessageWebhook,
  clientId: WhatsAppApiClient
): Promise<void> => {
  const { wa_id: whatsappId } = body.contacts[0]
  const { id: messageId, type } = body.messages[0]
  if (type !== WhatsappWebhookMessageType.text) {
    // not text message, log and ignore
    logger.info({
      message: 'Received webhook for non-text message',
      meta: {
        whatsappId,
        messageId,
        type,
      },
    })
    return
  }
  const message = body.messages[0] as WhatsAppWebhookTextMessage
  const { body: rawMessageBody } = message.text
  const sanitisedMessageBody = validator.blacklist(
    rawMessageBody,
    '\\/\\\\[\\]<>()*'
  )
  const autoReplyNeeded = shouldSendAutoReply(sanitisedMessageBody)
  if (!autoReplyNeeded) return
  logger.info({
    message: 'Sending auto reply',
    meta: {
      whatsappId,
      messageId,
      messageBody: sanitisedMessageBody,
    },
  })
  await sendAutoReply(whatsappId, clientId)
}

const shouldSendAutoReply = (messageBody: string): boolean => {
  if (messageBody.length > 256 || messageBody.length === 0) {
    return false
  }
  const regexMatchFound = matchRegex(messageBody, [
    new RegExp(/^[*]?Auto\s?Reply/i),
    new RegExp(/thank you for/i),
    new RegExp(/i have received your message/i),
    new RegExp(/http[s]*/i),
    new RegExp(/out of office/i),
    new RegExp(/dear customer[s]*/i),
  ])
  if (regexMatchFound) return false
  return true
}

function matchRegex(input: string, validations: Array<RegExp>): boolean {
  try {
    for (let index = 0; index < validations.length; index++) {
      const validation = validations[index]
      if (validation.test(input)) {
        return true
      }
    }
    return false
  } catch (error) {
    logger.error({ errorTitle: 'Error validating user input', error })
    return true
  }
}

async function sendAutoReply(
  whatsappId: WhatsAppId,
  clientId: WhatsAppApiClient
): Promise<void> {
  const isLocal = config.get('env') === 'development'
  if (isLocal) {
    const templateMessageToSend: WhatsAppTemplateMessageToSend = {
      recipient: whatsappId,
      apiClient: clientId,
      templateName: '2019covid19_ack',
      params: [],
      language: WhatsAppLanguages.english,
    }
    await WhatsAppService.whatsappClient.sendTemplateMessage(
      templateMessageToSend,
      isLocal
    )
    return
  }
  const textMessageToSend: WhatsAppTextMessageToSend = {
    recipient: whatsappId,
    apiClient: clientId,
    body: 'If you are inquiring about COVID-19 updates, please note that the COVID-19 Chatbot is currently put on pause. Thank you for your patience.',
  }
  // can substitute this with template message if we get such a template approved
  await WhatsAppService.whatsappClient.sendTextMessage(textMessageToSend)
}

export const GovsgCallbackService = { isAuthenticated, parseWebhook }
