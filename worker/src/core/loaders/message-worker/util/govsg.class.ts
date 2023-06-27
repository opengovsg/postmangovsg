import { loggerWithLabel } from '@core/logger'
import { map } from 'lodash'
import { QueryTypes, Transaction } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'
import OnpremWhatsappClient from '@shared/clients/onprem-whatsapp-client.class'
import { PhoneNumberService } from '@core/services/phone-number.service'
import config from '@core/config'

const logger = loggerWithLabel(module)

class Govsg {
  private workerId: string
  private connection: Sequelize
  private client: OnpremWhatsappClient

  constructor(workerId: string, connection: Sequelize) {
    this.workerId = workerId
    this.connection = connection
    this.client = new OnpremWhatsappClient()
  }

  async enqueueMessages(jobId: number, campaignId: number): Promise<void> {
    await this.connection.transaction(async (transaction: Transaction) => {
      await this.connection.query('SELECT enqueue_messages_govsg(:jobId);', {
        replacements: { jobId },
        type: QueryTypes.SELECT,
        transaction,
      })

      await this.connection.query('SELECT update_stats_govsg(:campaignId);', {
        replacements: { campaignId },
        type: QueryTypes.SELECT,
        transaction,
      })
    })
    logger.info({
      message: 'Enqueued govsg messages',
      workerId: this.workerId,
      jobId,
      action: 'enqueueMessages',
    })
  }

  async getMessages(
    jobId: number,
    rate: number
  ): Promise<
    {
      id: number
      recipient: string
      params: { [key: string]: string }
      body: string
      campaignId: number
      whatsappTemplateLabel: string
      paramOrder: string[]
    }[]
  > {
    const dbResults = await this.connection.query(
      'SELECT get_messages_to_send_govsg(:jobId, :rate);',
      {
        replacements: { jobId, rate },
        type: QueryTypes.SELECT,
      }
    )
    return map(dbResults, 'get_messages_to_send_govsg')
  }

  async sendMessage({
    id,
    recipient,
    params,
    paramOrder,
    whatsappTemplateLabel,
  }: {
    id: number
    recipient: string
    params: { [key: string]: string }
    paramOrder?: string[]
    whatsappTemplateLabel?: string
  }): Promise<void> {
    try {
      let normalisedRecipient
      try {
        normalisedRecipient = PhoneNumberService.normalisePhoneNumber(
          recipient,
          config.get('defaultCountry')
        )
      } catch (e: any) {
        throw {
          errorCode: 'invalid_recipient',
          message: (e as Error).message,
        }
      }
      if (!whatsappTemplateLabel || !paramOrder) {
        throw new Error('Missing template label or param order')
      }
      const serviceProviderMessageId = await this.client.send(
        normalisedRecipient,
        whatsappTemplateLabel,
        paramOrder.map((p) => params[p])
      )
      await this.connection.query(
        `UPDATE govsg_ops SET status='SENT', sent_at=clock_timestamp(), 
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
        await this.connection.query(
          `UPDATE govsg_ops SET status='INVALID_RECIPIENT', 
            sent_at=clock_timestamp(), updated_at=clock_timestamp()
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

      await this.connection.query(
        `UPDATE govsg_ops SET status='ERROR', sent_at=clock_timestamp(),
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
