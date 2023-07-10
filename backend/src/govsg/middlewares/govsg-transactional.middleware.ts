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
import { GovsgTransactionalService } from '../services/govsg-transactional.service'
import WhatsAppClient from '@shared/clients/whatsapp-client.class'
import { NormalisedParam } from '@shared/clients/whatsapp-client.class/types'
import { PhoneNumberService } from '@shared/utils/phone-number.service'

export interface GovsgTransactionalMiddleware {
  saveMessage: Handler
  sendMessage: Handler
}

export const InitGovsgTransactionalMiddleware =
  (): GovsgTransactionalMiddleware => {
    const logger = loggerWithLabel(module)

    interface ReqBody {
      recipient: string
      whatsapp_template_label: string
      params?: Record<string, string>
    }
    type ReqBodyWithId = ReqBody & {
      govsgTransactionalId: string
      normalisedParams: NormalisedParam[]
    }

    function convertMessageModelToResponse(message: GovsgMessageTransactional) {
      return {
        id: message.id,
        // todo
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
        whatsapp_template_label: whatsappTemplateLabel,
        params,
        // use of as is safe because of validation by Joi; see govsg-transactional.route.ts
      } = req.body as ReqBody

      const govsgTemplate = await GovsgTemplate.findOne({
        where: {
          whatsappTemplateLabel,
        },
      })
      if (!govsgTemplate) {
        throw new ApiNotFoundError(
          `Template with label ${whatsappTemplateLabel} not found`
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
        whatsappTemplateLabel
      )
      const govsgTransactional = await GovsgMessageTransactional.create({
        templateId: govsgTemplate.id,
        userId: req.session?.user?.id,
        recipient: normalisedRecipient,
        params: params ?? [],
        status: GovsgMessageStatus.Unsent,
      } as unknown as GovsgMessageTransactional)
      // insert id into req.body so that subsequent middlewares can use it
      req.body.govsgTransactionalId = govsgTransactional.id
      next()
    }

    function validateParams(
      govsgTemplateParams: GovsgTemplate['params'],
      params: Record<string, string> | undefined,
      whatsappTemplateLabel: string
    ): NormalisedParam[] {
      const isParamsProvided =
        params !== undefined && Object.keys(params).length > 0
      const isParamsRequired =
        govsgTemplateParams !== null && govsgTemplateParams.length > 0
      if (!isParamsRequired && !isParamsProvided) {
        return []
      }
      if (!isParamsProvided && isParamsRequired) {
        throw new ApiValidationError(
          `no params provided; params needed for template ${whatsappTemplateLabel}`
        )
      }
      // not sure whether throwing this error is necessary
      if (isParamsProvided && !isParamsRequired) {
        throw new ApiValidationError(
          `template ${whatsappTemplateLabel} does not accept any params`
        )
      }
      if (isParamsProvided && isParamsRequired) {
        // TODO:
        // validate params actually match the array of params accepted by GovsgTemplate
        // check to ensure both are the same length, if not throw error
        // for key in params, find in govsgTemplate.params
        return WhatsAppClient.transformNamedParams(
          params as { [key: string]: string },
          govsgTemplateParams
        )
      }
      throw new Error('impossible to reach here')
    }

    async function sendMessage(
      req: Request<unknown, unknown, ReqBodyWithId>,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      const action = 'sendMessage'
      logger.info({ message: 'Sending GovSG transactional msg', action })
      const {
        govsgTransactionalId,
        whatsapp_template_label: whatsappTemplateLabel,
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
        const messageId = await GovsgTransactionalService.sendMessage({
          recipient: govsgTransactional.recipient,
          templateName: whatsappTemplateLabel,
          params: req.body.normalisedParams as NormalisedParam[],
        }).catch((err) => {
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
        })
        govsgTransactional.set('status', GovsgMessageStatus.Accepted)
        govsgTransactional.set('acceptedAt', new Date())
        govsgTransactional.set('serviceProviderMessageId', messageId)
        await govsgTransactional.save()

        res.status(201).json(convertMessageModelToResponse(govsgTransactional))
        return
      } catch (error) {
        logger.error({
          message: 'Failed to send GovSG transactional msg',
          action,
          error,
        })
        next(error)
      }
    }

    return {
      saveMessage,
      sendMessage,
    }
  }
