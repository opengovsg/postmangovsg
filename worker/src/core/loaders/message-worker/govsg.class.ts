import { loggerWithLabel } from '@core/logger'
import { map } from 'lodash'
import { QueryTypes, Transaction } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'
import config from '@core/config'
import WhatsAppClient from '@shared/clients/whatsapp-client.class'
import FlamingoDbClient from '@shared/clients/flamingo-db-client.class'
import {
  NormalisedParam,
  WhatsAppApiClient,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/types'
import { PhoneNumberService } from '@shared/utils/phone-number.service'
import { InvalidRecipientError } from '@shared/clients/whatsapp-client.class/errors'

const logger = loggerWithLabel(module)

class Govsg {
  private workerId: string
  private postmanConnection: Sequelize
  private whatsappClient: WhatsAppClient
  private flamingoDbClient: FlamingoDbClient

  constructor(
    workerId: string,
    postmanConnection: Sequelize,
    flamingoConnection: Sequelize
  ) {
    const isLocal = config.get('env') === 'development'
    this.workerId = workerId
    this.postmanConnection = postmanConnection
    this.whatsappClient = new WhatsAppClient(config.get('whatsapp'), isLocal)
    this.flamingoDbClient = new FlamingoDbClient(flamingoConnection)
  }

  async enqueueMessages(jobId: number, campaignId: number): Promise<void> {
    await this.postmanConnection.transaction(
      async (transaction: Transaction) => {
        await this.postmanConnection.query(
          'SELECT enqueue_messages_govsg(:jobId);',
          {
            replacements: { jobId },
            type: QueryTypes.SELECT,
            transaction,
          }
        )

        await this.postmanConnection.query(
          'SELECT update_stats_govsg(:campaignId);',
          {
            replacements: { campaignId },
            type: QueryTypes.SELECT,
            transaction,
          }
        )
      }
    )
    logger.info({
      message: 'Enqueued govsg messages',
      workerId: this.workerId,
      jobId,
      action: 'enqueueMessages',
    })
  }

  async getMessages(jobId: number, rate: number) {
    try {
      type Message = {
        id: number
        recipient: string
        params: { [key: string]: string }
        body: string
        campaignId: number
        whatsappTemplateLabel: string
        languageCode: string
        paramOrder: string[]
      }
      const initialDbResults: Message[] = map(
        await this.postmanConnection.query(
          'SELECT get_messages_to_send_govsg(:jobId, :rate);',
          {
            replacements: { jobId, rate },
            type: QueryTypes.SELECT,
          }
        ),
        'get_messages_to_send_govsg'
      )
      const cleanDbResults: Message[] = []
      const invalidIdsDetectedFromFormat: number[] = []
      initialDbResults.forEach((r) => {
        try {
          r.recipient = PhoneNumberService.normalisePhoneNumber(
            r.recipient,
            config.get('defaultCountry')
          )
          cleanDbResults.push(r)
        } catch {
          invalidIdsDetectedFromFormat.push(r.id)
        }
      })
      if (invalidIdsDetectedFromFormat.length > 0) {
        await this.postmanConnection.query(
          `UPDATE
          govsg_ops
        SET
          status = 'INVALID_RECIPIENT',
          updated_at=clock_timestamp()
        WHERE
          id IN (:ids);`,
          {
            replacements: { ids: invalidIdsDetectedFromFormat },
            type: QueryTypes.UPDATE,
          }
        )
      }
      if (cleanDbResults.length === 0) {
        if (initialDbResults.length > 0) {
          // Has to run one more time get_messages db function to set the job
          // queue item to `SENT` if needed
          await this.postmanConnection.query(
            'SELECT get_messages_to_send_govsg(:jobId, :rate);',
            {
              replacements: { jobId, rate },
              type: QueryTypes.SELECT,
            }
          )
        }
        return []
      }

      const apiClientIdMap = await this.flamingoDbClient.getApiClientId(
        cleanDbResults.map((result) => result.recipient)
      )

      const messagesToSend = cleanDbResults.map((result) => ({
        id: result.id, // need this to update govsg_ops table
        recipient: result.recipient,
        templateName: result.whatsappTemplateLabel,
        params: WhatsAppClient.transformNamedParams(
          result.params,
          result.paramOrder
        ),
        apiClient:
          apiClientIdMap.get(result.recipient) ?? WhatsAppApiClient.clientTwo,
        language: result.languageCode,
      }))

      return messagesToSend.map((message) => ({
        ...message,
        body: '', // just putting this in to satisfy the interface grrr
      }))
    } catch (error) {
      logger.error({
        message: '[govsg.class.getMessages] Error processing messages',
        error,
        workerId: this.workerId,
      })
      return []
    }
  }

  async sendMessage({
    id,
    recipient,
    templateName,
    params,
    apiClient,
    language,
  }: {
    id: number
    recipient: string
    templateName: string
    params: NormalisedParam[]
    // in practice, these are compulsory parameters
    // but they are optional here to follow the implicit interface in worker class
    apiClient: WhatsAppApiClient
    language: WhatsAppLanguages
  }): Promise<void> {
    try {
      if (!templateName) {
        throw new Error('Missing template label')
      }
      const isLocal = config.get('env') === 'development'
      const serviceProviderMessageId =
        await this.whatsappClient.sendTemplateMessage(
          {
            recipient,
            templateName,
            params,
            apiClient,
            language,
          },
          isLocal
        )
      await this.postmanConnection.query(
        `UPDATE govsg_ops SET status='ACCEPTED', accepted_at=clock_timestamp(),
        service_provider_message_id=:serviceProviderMessageId, updated_at=clock_timestamp()
        WHERE id=:id;`,
        {
          replacements: { id, serviceProviderMessageId },
          type: QueryTypes.UPDATE,
        }
      )
      logger.info({
        message: 'Sent govsg message',
        workerId: this.workerId,
        id,
        action: 'sendMessage',
      })
    } catch (error: any) {
      if (error instanceof InvalidRecipientError) {
        await this.postmanConnection.query(
          `UPDATE govsg_ops SET status='INVALID_RECIPIENT',
          updated_at=clock_timestamp()
            where id=:id`,
          {
            replacements: {
              id,
            },
            type: QueryTypes.UPDATE,
          }
        )
        return
      }

      await this.postmanConnection.query(
        `UPDATE govsg_ops SET status='ERROR', errored_at=clock_timestamp(),
	        error_code=:errorCode, error_description=:description, updated_at=clock_timestamp()
	        where id=:id`,
        {
          replacements: {
            id,
            description: (error as Error).message,
            errorCode:
              (error as { errorCode: string }).errorCode ||
              'failed_sending_attempt',
          },
          type: QueryTypes.UPDATE,
        }
      )
    }
  }
  async setSendingService(_: string): Promise<void> {
    // Do nothing
    return
  }

  destroySendingService(): void {
    // Do nothing
    return
  }
}

export default Govsg
