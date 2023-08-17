import config from '@core/config'
import { whatsappService } from '@core/services'
import { GovsgMessage, GovsgVerification } from '@govsg/models'
import {
  WhatsAppId,
  WhatsAppApiClient,
  MessageId,
  WhatsAppTemplateMessageToSend,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/types'

import { randomInt } from 'node:crypto'

export const sendPasscodeCreationMessage = async (
  whatsappId: WhatsAppId,
  clientId: WhatsAppApiClient
): Promise<MessageId> => {
  const templateMessageToSend: WhatsAppTemplateMessageToSend = {
    recipient: whatsappId,
    apiClient: clientId,
    templateName: 'sgc_passcode_generation', // TODO: Un-hardcode this
    params: [],
    language: WhatsAppLanguages.english,
  }
  const isLocal = config.get('env') === 'development'
  const passcodeCreationWamid =
    await whatsappService.whatsappClient.sendTemplateMessage(
      templateMessageToSend,
      isLocal
    )
  return passcodeCreationWamid
}

const createPasscode = () => {
  return randomInt(0, Math.pow(10, 4)).toString().padStart(4, '0')
}

export const storePrecreatedPasscode = async (
  govsgMessageId: GovsgMessage['id'],
  passcodeCreationWamid: MessageId
): Promise<GovsgVerification> => {
  const govsgVerification = await GovsgVerification.findOne({
    where: { govsgMessageId },
  })
  if (!govsgVerification) {
    const passcode = createPasscode()
    return await GovsgVerification.create({
      govsgMessageId,
      passcodeCreationWamid,
      passcode,
    } as GovsgVerification)
  }
  return await govsgVerification?.update({
    passcodeCreationWamid,
  })
}

export const sendPasscodeMessage = async (
  whatsappId: WhatsAppId,
  clientId: WhatsAppApiClient,
  officerName: string,
  officerAgency: string,
  passcode: string
): Promise<MessageId> => {
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
  const isLocal = config.get('env') === 'development'
  const passcodeCreationWamid =
    await whatsappService.whatsappClient.sendTemplateMessage(
      templateMessageToSend,
      isLocal
    )
  return passcodeCreationWamid
}
