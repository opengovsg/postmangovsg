import config from '@core/config'
import { whatsappService } from '@core/services'
import { GovsgMessage, GovsgVerification } from '@govsg/models'
import { createPasscode } from '@govsg/utils/passcode'
import {
  WhatsAppId,
  WhatsAppApiClient,
  MessageId,
  WhatsAppTemplateMessageToSend,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/types'

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

export const storePrecreatedPasscode = async (
  govsgMessageId: GovsgMessage['id'],
  passcodeCreationWamid: MessageId
): Promise<GovsgVerification> => {
  const govsgVerification = await GovsgVerification.findOne({
    where: { govsgMessageId },
  })
  if (!govsgVerification) {
    return await GovsgVerification.create({
      govsgMessageId,
      passcodeCreationWamid,
      passcode: createPasscode(),
    } as GovsgVerification)
  }
  return await govsgVerification.update({
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
