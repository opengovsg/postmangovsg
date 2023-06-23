import { loggerWithLabel } from '@core/logger'
import { Handler, NextFunction, Request, Response } from 'express'
import { GovsgMessageTransactional } from '../govsg-message-transactional'
import { GovsgTemplate } from '../govsg-template'
import {
  ApiNotFoundError,
  ApiValidationError,
} from '@core/errors/rest-api.errors'
import { GovsgMessageStatus } from '@core/constants'

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
      params: {
        [key: string]: string
      }
      [key: string]: unknown
    }

    function convertMessageModelToResponse(message: GovsgMessageTransactional) {
      return {
        id: message.id,
        // todo
      }
    }

    async function saveMessage(
      req: Request<unknown, unknown, ReqBody>,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      const action = 'saveMessage'
      logger.info({ message: 'Saving GovSG transactional msg', action })
      const { recipient, whatsapp_template_label, params } = req.body

      const govsgTemplate = await GovsgTemplate.findOne({
        where: {
          whatsappTemplateLabel: whatsapp_template_label,
        },
      })
      if (!govsgTemplate) {
        throw new ApiNotFoundError(
          `Template with label ${whatsapp_template_label} not found`
        )
      }
      const govsgTransactional = await GovsgMessageTransactional.create({
        templateId: govsgTemplate.id,
        userId: req.session?.user?.id,
        recipient,
        params,
        status: GovsgMessageStatus.Unsent,
      } as unknown as GovsgMessageTransactional)
      req.body.govsgTransactionalId = govsgTransactional.id
      next()
    }

    async function sendMessage(
      req: Request<unknown, unknown, ReqBody>,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      const action = 'sendMessage'
      logger.info({ message: 'Sending GovSG transactional msg', action })
      const { recipient, govsgTransactionalId } = req.body
      if (typeof govsgTransactionalId !== 'string') {
        throw new ApiValidationError(
          `govsgTransactionalId ${govsgTransactionalId} is not a string`
        )
      }
      try {
        const govsgTransactional = await GovsgMessageTransactional.findByPk(
          govsgTransactionalId
        )
        if (!govsgTransactional) {
          // practically this will never happen but adding to fulfill TypeScript
          // type-safety requirement
          throw new ApiNotFoundError(
            `Unable to find id ${govsgTransactionalId} in govsg_messages_transactional`
          )
        }
        await GovsgTransactionalService.sendMessage({
          recipient,
          govsgTransactionalId: +govsgTransactionalId,
        })
        govsgTransactional.set(
          'status',
          TransactionalGovsgMessageStatus.Accepted
        )
        govsgTransactional.set('acceptedAt', new Date())
        await govsgTransactional.save()

        res.status(201)
        res.status(201).json(convertMessageModelToResponse(govsgTransactional))
        return
      } catch (error) {
        logger.error({
          message: 'Failed to send GovSG transactional msg',
          action,
          error,
        })
        // todo process error type
        next(error)
      }
    }

    return {
      saveMessage,
      sendMessage,
    }
  }
