import { CampaignService, PhoneNumberService } from '@core/services'
import config from '@core/config'
import { InvalidRecipientError } from '@core/errors'
import WhatsappClient from '@shared/clients/whatsapp-client.class'
import { loggerWithLabel } from '@core/logger'
import { Campaign } from '@core/models'
import { ChannelType } from '@core/constants'
import { CampaignDetails } from '@core/interfaces'

const logger = loggerWithLabel(module)

const whatsappClient: WhatsappClient = new WhatsappClient({
  baseUrl: config.get('whatsapp.endpointUrl'),
  bearerToken: config.get('whatsapp.bearerToken'),
  version: config.get('whatsapp.endpointVersion'),
})

// this is just used to validate credentials or verify that a set of credentials work
const whatsappDefaultMessage = {
  content: {
    type: 'template',
    template: {
      name: 'hello_world',
      language: {
        code: 'en_US',
      },
    },
  },
}

const getCampaignDetails = async (
  campaignId: number
): Promise<CampaignDetails> => {
  return await CampaignService.getCampaignDetails(campaignId, [])
}
const findCampaign = (
  campaignId: number,
  userId: number
): Promise<Campaign> => {
  return Campaign.findOne({
    where: {
      id: campaignId,
      userId,
      type: ChannelType.Whatsapp,
    },
  }) as Promise<Campaign>
}

const sendMessage = (from: string, recipient: string, content: any) => {
  try {
    // strip out the plus sign afterwards
    recipient = PhoneNumberService.normalisePhoneNumber(
      recipient,
      config.get('defaultCountry')
    ).substring(1)
  } catch (err) {
    throw new InvalidRecipientError('Invalid phone number')
  }

  return whatsappClient.sendMessage(from, recipient, content)
}

const getPhoneNumbers = (wabaId: string) => {
  logger.info({ message: wabaId })
  return whatsappClient.getPhoneNumbers(wabaId)
}

const getHydratedMessage = async (
  campaignId: number,
  template: string
): Promise<any> => {
  return { campaignId, template }
}
const setCampaignCredentials = (
  campaignId: number,
  credentialName: string
): Promise<[number]> => {
  return Campaign.update(
    { credName: credentialName },
    {
      where: {
        id: campaignId,
      },
      returning: false,
    }
  )
}

const getTemplates = (wabaId: string) => {
  logger.info({ message: wabaId })
  return whatsappClient.getTemplates(wabaId)
}

const sendValidationMessage = (
  from: string,
  recipient: string
): Promise<string | void> => {
  return whatsappClient.sendMessage(from, recipient, {
    ...whatsappDefaultMessage,
  })
}

const sendCampaignTemplateMessage = async (
  campaignId: number,
  template: string,
  from: string,
  recipient: string
): Promise<string | void> => {
  const msg = await getHydratedMessage(campaignId, template)
  if (!msg) {
    throw new Error('No message to send')
  }
  return sendMessage(from, recipient, '')
}
export const WhatsappService = {
  findCampaign,
  whatsappClient,
  sendMessage,
  getCampaignDetails,
  getPhoneNumbers,
  setCampaignCredentials,
  getHydratedMessage,
  getTemplates,
  sendValidationMessage,
  sendCampaignTemplateMessage,
}
