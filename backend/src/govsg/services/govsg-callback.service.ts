import config from '@core/config'
import { MessageId } from '@shared/clients/whatsapp-client.class/types/general'
import validator from 'validator'
import { loggerWithLabel } from '@core/logger'
import { Campaign } from '@core/models'
import {
  UserMessageWebhook,
  WhatsAppApiClient,
  WhatsAppId,
  WhatsAppLanguages,
  WhatsAppMessageStatus,
  WhatsAppTemplateMessageToSend,
  WhatsAppTemplateMessageWebhook,
  WhatsAppTextMessageToSend,
  WhatsAppWebhookButtonMessage,
  WhatsAppWebhookTextMessage,
  WhatsappWebhookMessageType,
} from '@shared/clients/whatsapp-client.class/types'
import {
  MessageIdNotFoundWebhookError,
  UnexpectedWebhookError,
} from '@shared/clients/whatsapp-client.class/errors'
import {
  CampaignGovsgTemplate,
  GovsgMessage,
  GovsgMessageTransactional,
  GovsgOp,
  GovsgTemplate,
} from '@govsg/models'
import {
  GovsgMessageStatus,
  govsgMessageStatusMapper,
  shouldUpdateStatus,
} from '@core/constants'
import { WhatsAppService } from '@core/services'
import { GovsgVerification } from '@govsg/models/govsg-verification'
import { randomInt } from 'node:crypto'

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
    await parseTemplateMessageWebhook(
      body as WhatsAppTemplateMessageWebhook,
      clientId
    )
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
  if ('errors' in body) {
    logger.error({
      message: 'Error webhooks from WhatsApp API client',
      body,
      action,
    })
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
  body: WhatsAppTemplateMessageWebhook,
  clientId: WhatsAppApiClient
): Promise<void> => {
  const {
    id: messageId,
    timestamp: timestampRaw,
    status: whatsappStatus,
  } = body.statuses[0]
  const timestamp = new Date(parseInt(timestampRaw, 10) * 1000) // convert to milliseconds
  const [govsgMessage, govsgMessageTransactional, govsgOp] = await Promise.all([
    GovsgMessage.findOne({ where: { serviceProviderMessageId: messageId } }),
    GovsgMessageTransactional.findOne({
      where: { serviceProviderMessageId: messageId },
    }),
    GovsgOp.findOne({ where: { serviceProviderMessageId: messageId } }),
  ])
  if (!govsgMessage && !govsgOp && !govsgMessageTransactional) {
    logger.info({
      message:
        'Received webhook for message not in GovsgMessage or GovsgMessageTransactional or GovsgOp',
      meta: {
        messageId,
      },
    })
    // throwing error here to return 400
    // this is because callbacks could hit this endpoint before the messageId is updated in GovsgOp table
    // only do this for sending as this is unlikely to happen for other statuses
    // this will trigger a retry from WhatsApp, which will hit this endpoint again after messageId is updated
    if (whatsappStatus === WhatsAppMessageStatus.sent) {
      throw new MessageIdNotFoundWebhookError('Message ID not found')
    }
    return
  }
  const inGovsgMessageOrOp = !!(govsgMessage || govsgOp)
  if (inGovsgMessageOrOp && govsgMessageTransactional) {
    // this should basically never happen
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
  // NB unable to abstract further with type safety because Sequelize doesn't
  // play well with TypeScript. I wanted to use GovsgMessage | GovsgMessageTransactional type
  // but I am unable to access the methods common to both models with type safety
  // hence the following horrible chunk of code
  // (Drizzle ORM doesn't have this problem)
  const whereOpts = {
    where: {
      serviceProviderMessageId: messageId,
    },
  }
  // can be certain at least one of these is defined
  if (whatsappStatus === WhatsAppMessageStatus.warning) {
    logger.warn({
      message: 'Received webhook with warning status',
      meta: {
        messageId,
        body,
      },
    })
    // no corresponding status to update
    // to do with items in catalog (e-commerce use case), not relevant to us
    // https://developers.facebook.com/docs/whatsapp/on-premises/webhooks/outbound/#notification-types
    return
  }
  const prevStatus =
    govsgMessage?.status ||
    govsgOp?.status ||
    (govsgMessageTransactional?.status as GovsgMessageStatus)
  const statusIfUpdated = govsgMessageStatusMapper(whatsappStatus)
  switch (whatsappStatus) {
    case WhatsAppMessageStatus.failed: {
      logger.info({
        message: 'Received webhook with error status',
      })
      if (!body.errors || body.errors.length === 0) {
        logger.error({
          message: 'Received webhook with error status but no error details',
          meta: {
            messageId,
            body,
          },
        })
        const fieldOpts = {
          status: shouldUpdateStatus(statusIfUpdated, prevStatus)
            ? statusIfUpdated
            : undefined,
          erroredAt: timestamp,
        }
        void govsgMessage?.update(fieldOpts, whereOpts)
        void govsgMessageTransactional?.update(fieldOpts, whereOpts)
        void govsgOp?.update(fieldOpts, whereOpts)
        // not sure whether need to throw an error hmm probably not?
        return
      }
      const { code, title, details, href } = body.errors[0]
      const errorCode = code.toString()
      const errorDescription = `${title} Details: ${details} href: ${href}`
      const fieldOpts = {
        status: shouldUpdateStatus(statusIfUpdated, prevStatus)
          ? statusIfUpdated
          : undefined,
        errorCode,
        errorDescription,
        erroredAt: timestamp,
      }
      void govsgMessage?.update(fieldOpts, whereOpts)
      void govsgMessageTransactional?.update(fieldOpts, whereOpts)
      void govsgOp?.update(fieldOpts, whereOpts)
      return
    }
    case WhatsAppMessageStatus.sent: {
      const fieldOpts = {
        status: shouldUpdateStatus(statusIfUpdated, prevStatus)
          ? statusIfUpdated
          : undefined,
        sentAt: timestamp,
      }
      void govsgMessage?.update(fieldOpts, whereOpts)
      void govsgMessageTransactional?.update(fieldOpts, whereOpts)
      void govsgOp?.update(fieldOpts, whereOpts)
      return
    }
    case WhatsAppMessageStatus.delivered: {
      const fieldOpts = {
        status: shouldUpdateStatus(statusIfUpdated, prevStatus)
          ? statusIfUpdated
          : undefined,
        deliveredAt: timestamp,
      }
      void govsgMessage?.update(fieldOpts, whereOpts)
      void govsgMessageTransactional?.update(fieldOpts, whereOpts)
      void govsgOp?.update(fieldOpts, whereOpts)
      if (!govsgMessage) {
        return
      }
      const { campaignId, recipient } = govsgMessage
      void CampaignGovsgTemplate.findOne({
        where: {
          campaignId,
        },
        include: [Campaign, GovsgTemplate],
      }).then((campaignGovsgTemplate) => {
        if (
          campaignGovsgTemplate?.govsgTemplate.whatsappTemplateLabel ===
          'sgc_notify_upcoming_call_1' // TODO: Un-hardcode this
        ) {
          void sendPasscodeCreationMessage(recipient, clientId).then(
            (passcodeCreationWamid) => {
              void storePrecreatedPasscode(
                govsgMessage.id,
                passcodeCreationWamid
              )
            }
          )
        }
      })
      return
    }
    case WhatsAppMessageStatus.read: {
      const fieldOpts = {
        status: shouldUpdateStatus(statusIfUpdated, prevStatus)
          ? statusIfUpdated
          : undefined,
        readAt: timestamp,
      }
      void govsgMessage?.update(fieldOpts, whereOpts)
      void govsgMessageTransactional?.update(fieldOpts, whereOpts)
      void govsgOp?.update(fieldOpts, whereOpts)
      return
    }
    case WhatsAppMessageStatus.deleted: {
      const fieldOpts = {
        status: shouldUpdateStatus(statusIfUpdated, prevStatus)
          ? statusIfUpdated
          : undefined,
        deletedByUserAt: timestamp,
      }
      void govsgMessage?.update(fieldOpts, whereOpts)
      void govsgMessageTransactional?.update(fieldOpts, whereOpts)
      void govsgOp?.update(fieldOpts, whereOpts)
      return
    }
    default: {
      const exhaustiveCheck: never = whatsappStatus
      throw new Error(`Unhandled status: ${exhaustiveCheck}`)
    }
  }
}

async function sendPasscodeCreationMessage(
  whatsappId: WhatsAppId,
  clientId: WhatsAppApiClient
): Promise<MessageId> {
  const templateMessageToSend: WhatsAppTemplateMessageToSend = {
    recipient: whatsappId,
    apiClient: clientId,
    templateName: 'sgc_passcode_generation', // TODO: Un-hardcode this
    params: [],
    language: WhatsAppLanguages.english,
  }
  const passcodeCreationWamid =
    await WhatsAppService.whatsappClient.sendTemplateMessage(
      templateMessageToSend
    )
  return passcodeCreationWamid
}

const createPasscode = () => {
  return randomInt(0, Math.pow(10, 4)).toString().padStart(4, '0')
}

async function storePrecreatedPasscode(
  govsgMessageId: GovsgMessage['id'],
  passcodeCreationWamid: MessageId
): Promise<GovsgVerification> {
  const passcode = createPasscode()
  return await GovsgVerification.create({
    govsgMessageId,
    passcodeCreationWamid,
    passcode,
  } as GovsgVerification)
}

// TODO: Tidy up params
async function sendPasscodeMessage(
  whatsappId: WhatsAppId,
  clientId: WhatsAppApiClient,
  officerName: string,
  officerAgency: string,
  passcode: string
): Promise<MessageId> {
  const templateMessageToSend: WhatsAppTemplateMessageToSend = {
    recipient: whatsappId,
    apiClient: clientId,
    templateName: 'sgc_send_passcode', // TODO: Un-hardcode this
    params: [
      {
        type: 'text',
        text: officerName,
      },
      {
        type: 'text',
        text: officerAgency,
      },
      {
        type: 'text',
        text: passcode,
      },
    ],
    language: WhatsAppLanguages.english,
  }
  const passcodeCreationWamid =
    await WhatsAppService.whatsappClient.sendTemplateMessage(
      templateMessageToSend
    )
  return passcodeCreationWamid
}

const parseUserMessageWebhook = async (
  body: UserMessageWebhook,
  clientId: WhatsAppApiClient
): Promise<void> => {
  const { wa_id: whatsappId } = body.contacts[0]
  const { id: messageId, type } = body.messages[0]
  if (type === WhatsappWebhookMessageType.button) {
    const message = body.messages[0] as WhatsAppWebhookButtonMessage
    if (message.button.text === 'Create passcode') {
      const passcodeCreationWamid = message.context.id
      const govsgVerification = await GovsgVerification.findOne({
        where: { passcodeCreationWamid },
        include: [GovsgMessage],
      })
      if (!govsgVerification) {
        // TODO: Update log statement
        logger.warn({
          message: `govsgVerification for an expected button reply was not found.`,
          meta: {
            whatsappId,
            messageId,
            type,
          },
        })
        return
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { officer_name: officerName, agency: officerAgency } =
        govsgVerification.govsgMessage.params
      const passcode = govsgVerification.passcode
      await sendPasscodeMessage(
        whatsappId,
        clientId,
        officerName,
        officerAgency,
        passcode
      )
      // TODO: Add log statement
    }
    return
  }
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
  const matchedRegex = matchAnyRegex(messageBody.toLowerCase(), [
    new RegExp(/auto.reply/i),
    new RegExp(/thank/i),
    new RegExp(/received your message/i),
    new RegExp(/http/i),
    new RegExp(/out.of.office/i),
    new RegExp(/dear customer*/i),
  ])
  if (matchedRegex) return false
  return true
}

function matchAnyRegex(input: string, validations: Array<RegExp>): boolean {
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
    // default to returning true, so that auto-reply will not be sent
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
    body: 'We are unable to receive replies at the moment.\n\nIf you are inquiring about COVID-19 updates, the COVID-19 infobot is temporarily unavailable due to maintenance work. For more COVID-19 related information, please visit the Ministry of Health’s website at moh.gov.sg. Thank you',
  }
  // can substitute this with template message if we get such a template approved
  await WhatsAppService.whatsappClient.sendTextMessage(textMessageToSend)
}

export const GovsgCallbackService = { isAuthenticated, parseWebhook }
