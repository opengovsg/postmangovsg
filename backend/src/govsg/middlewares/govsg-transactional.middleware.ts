import { loggerWithLabel } from '@core/logger'
import { Handler, NextFunction, Request, Response } from 'express'
import { GovsgMessageTransactional } from '../models/govsg-message-transactional'
import { GovsgTemplate } from '../models/govsg-template'
import {
  ApiInvalidRecipientError,
  ApiNotFoundError,
  ApiValidationError,
} from '@core/errors/rest-api.errors'
import { GovsgMessageStatus } from '@core/constants'
import { GovsgTransactionalService } from '@govsg/services'
import WhatsAppClient from '@shared/clients/whatsapp-client.class'
import {
  NormalisedParam,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/types'
import { PhoneNumberService } from '@shared/utils/phone-number.service'

export interface GovsgTransactionalMiddleware {
  saveMessage: Handler
  sendMessage: Handler
  getById: Handler
}

export const InitGovsgTransactionalMiddleware =
  (): GovsgTransactionalMiddleware => {
    const logger = loggerWithLabel(module)

    interface ReqBody {
      recipient: string
      template_id: string
      params: Record<string, string>
      language_code: WhatsAppLanguages
    }
    type ReqBodyWithSendingDetails = ReqBody & {
      govsgTransactionalId: string
      templateName: string
      normalisedParams: NormalisedParam[]
    }

    function convertMessageModelToResponse(message: GovsgMessageTransactional) {
      return {
        id: message.id,
        recipient: message.recipient,
        template_id: message.templateId,
        params: message.params,
        language_code: message.languageCode,
        created_at: message.createdAt,
        updated_at: message.updatedAt,
        accepted_at: message.acceptedAt,
        sent_at: message.sentAt,
        delivered_at: message.deliveredAt,
        read_at: message.readAt,
        errored_at: message.erroredAt,
        error_code: message.errorCode,
        error_description: message.errorDescription,
        status: message.status,
      }
    }

    async function saveMessage(
      req: Request,
      _: Response,
      next: NextFunction
    ): Promise<void> {
      const action = 'saveMessage'
      logger.info({ message: 'Saving transactional GovSG message', action })
      const {
        recipient,
        template_id: templateId,
        language_code: languageCode,
        params,
        // use of as is safe because of validation by Joi; see govsg-transactional.route.ts
      } = req.body as ReqBody

      const govsgTemplate = await GovsgTemplate.findOne({
        where: {
          id: +templateId,
        },
      })
      if (!govsgTemplate) {
        throw new ApiNotFoundError(`Template with ID ${templateId} not found`)
      }
      const isLanguageAvailable =
        govsgTemplate.multilingualSupport.findIndex(
          (v) => v.languageCode === languageCode
        ) > -1
      if (!isLanguageAvailable && languageCode !== WhatsAppLanguages.english) {
        throw new ApiValidationError(
          `Language Code ${languageCode} not available on the template`
        )
      }
      let normalisedRecipient
      try {
        normalisedRecipient = PhoneNumberService.normalisePhoneNumber(recipient)
      } catch {
        throw new ApiValidationError(
          `recipient ${recipient} is not a valid phone number`
        )
      }

      req.body.normalisedParams = validateParams(
        govsgTemplate.params,
        params,
        templateId
      )
      const govsgTransactional = await GovsgMessageTransactional.create({
        templateId: govsgTemplate.id,
        userId: req.session?.user?.id,
        recipient: normalisedRecipient,
        params: params ?? {},
        status: GovsgMessageStatus.Unsent,
        languageCode,
      } as unknown as GovsgMessageTransactional)
      // insert id into req.body so that subsequent middlewares can use it
      req.body.govsgTransactionalId = govsgTransactional.id
      req.body.templateName = govsgTemplate.whatsappTemplateLabel
      next()
    }

    function validateParams(
      govsgTemplateParams: GovsgTemplate['params'],
      params: Record<string, string>,
      templateId: string
    ): NormalisedParam[] {
      const isParamsProvided = Object.keys(params).length > 0
      const isParamsRequired =
        govsgTemplateParams !== null && govsgTemplateParams.length > 0
      if (!isParamsRequired && !isParamsProvided) {
        return []
      }
      if (!isParamsProvided && isParamsRequired) {
        throw new ApiValidationError(
          `No params provided; params needed for template ${templateId}`
        )
      }
      // not sure whether throwing this error is necessary
      if (isParamsProvided && !isParamsRequired) {
        throw new ApiValidationError(
          `Template ${templateId} does not accept any params`
        )
      }

      govsgTemplateParams = govsgTemplateParams as string[]
      const missingParams = govsgTemplateParams.filter((p) => !params[p])
      if (missingParams.length > 0) {
        throw new ApiValidationError(
          `Missing values for params ${missingParams.join(', ')}`
        )
      }
      return WhatsAppClient.transformNamedParams(
        params as { [key: string]: string },
        govsgTemplateParams
      )
    }

    async function sendMessage(
      req: Request<unknown, unknown, ReqBodyWithSendingDetails>,
      res: Response
    ): Promise<Response> {
      const action = 'sendMessage'
      logger.info({ message: 'Sending GovSG transactional msg', action })
      const {
        govsgTransactionalId,
        templateName,
        normalisedParams,
        language_code: languageCode,
      } = req.body
      try {
        const govsgTransactional = await GovsgMessageTransactional.findByPk(
          govsgTransactionalId
        )
        if (!govsgTransactional) {
          // practically this will never happen unless sendMessage is called before saveMessage
          throw new ApiNotFoundError(
            `Unable to find id ${govsgTransactionalId} in govsg_messages_transactional`
          )
        }

        try {
          const messageId = await GovsgTransactionalService.sendMessage({
            recipient: govsgTransactional.recipient,
            templateName,
            params: normalisedParams,
            languageCode,
          })
          govsgTransactional.set('status', GovsgMessageStatus.Accepted)
          govsgTransactional.set('acceptedAt', new Date())
          govsgTransactional.set('serviceProviderMessageId', messageId)
          await govsgTransactional.save()

          return res
            .status(201)
            .json(convertMessageModelToResponse(govsgTransactional))
        } catch (err) {
          if (err instanceof ApiInvalidRecipientError) {
            govsgTransactional.set(
              'status',
              GovsgMessageStatus.InvalidRecipient
            )
            govsgTransactional.set('errorCode', err.httpStatusCode.toString())
            govsgTransactional.set('errorDescription', err.errorCode)
            govsgTransactional.set('erroredAt', new Date())
            void govsgTransactional.save()
          }
          throw err
        }
      } catch (error) {
        logger.error({
          message: 'Failed to send GovSG transactional msg',
          action,
          error,
        })
        throw error
      }
    }

    async function getById(req: Request, res: Response): Promise<Response> {
      const { messageId } = req.params
      const message = await GovsgMessageTransactional.findOne({
        where: { id: messageId, userId: req.session?.user?.id.toString() },
      })
      if (!message) {
        throw new ApiNotFoundError(
          `GovSG message with ID ${messageId} not found.`
        )
      }

      return res.status(200).json(convertMessageModelToResponse(message))
    }

    return {
      saveMessage,
      sendMessage,
      getById,
    }
  }
