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
import { PhoneNumberService } from '@core/services/phone-number.service'

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
    this.workerId = workerId
    this.postmanConnection = postmanConnection
    this.whatsappClient = new WhatsAppClient(config.get('whatsapp'))
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
    const dbResults: {
      id: number
      recipient: string
      params: { [key: string]: string }
      body: string
      campaignId: number
      whatsappTemplateLabel: string
      paramOrder: string[]
    }[] = map(
      await this.postmanConnection.query(
        'SELECT get_messages_to_send_govsg(:jobId, :rate);',
        {
          replacements: { jobId, rate },
          type: QueryTypes.SELECT,
        }
      ),
      'get_messages_to_send_govsg'
    )
    if (dbResults.length === 0) {
      return []
    }
    dbResults.forEach((r) => {
      r.recipient = PhoneNumberService.normalisePhoneNumber(
        r.recipient,
        config.get('defaultCountry')
      )
    })
    const apiClientIdMap = await this.flamingoDbClient.getApiClientId(
      dbResults.map((result) => result.recipient)
    )

    const unvalidatedMessages = dbResults.map((result) => ({
      id: result.id, // need this to update govsg_ops table
      recipient: result.recipient,
      templateName: result.whatsappTemplateLabel,
      params: WhatsAppClient.transformNamedParams(
        result.params,
        result.paramOrder
      ),
      apiClient:
        apiClientIdMap.get(result.recipient) ?? WhatsAppApiClient.clientTwo,
      language: WhatsAppLanguages.english,
    }))
    const validatedWhatsAppIds =
      await this.whatsappClient.validateMultipleRecipients(
        unvalidatedMessages,
        config.get('env') === 'development'
      )
    const invalidMessages = validatedWhatsAppIds.filter(
      (message) => message.status === 'failed'
    )
    // update govsg_ops table with invalid messages
    if (invalidMessages.length > 0) {
      await this.postmanConnection.query(
        `UPDATE
                                            govsg_ops
                                          SET
                                            status = 'INVALID_RECIPIENT', updated_at=clock_timestamp()
                                          WHERE
                                            id IN (:ids);`,
        {
          replacements: { ids: invalidMessages.map((message) => message.id) },
          type: QueryTypes.UPDATE,
        }
      )
    }
    return validatedWhatsAppIds
      .filter((message) => message.status === 'valid')
      .map((message) => ({
        ...message,
        body: '', // just putting this in to satisfy the interface grrr
      }))
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
      if ((error as { errorCode: string }).errorCode === 'invalid_recipient') {
        await this.postmanConnection.query(
          `UPDATE govsg_ops SET status='INVALID_RECIPIENT', updated_at=clock_timestamp()
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
