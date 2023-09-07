import { Request, Response } from 'express'
import { whatsappService } from '@core/services/whatsapp.service'
import {
  CampaignGovsgTemplate,
  GovsgMessage,
  GovsgTemplate,
} from '@govsg/models'
import { GovsgVerification } from '@govsg/models/govsg-verification'
import {
  WhatsAppApiClient,
  WhatsAppLanguages,
  WhatsAppTemplateMessageToSend,
} from '@shared/clients/whatsapp-client.class/types'
import { sendMessage } from '@govsg/services/govsg-verification-service'
import { Op } from 'sequelize'
import { PhoneNumberService } from '@shared/utils/phone-number.service'
import { Campaign } from '@core/models'
import WhatsAppClient from '@shared/clients/whatsapp-client.class'

const generateSearchOptions = (search: string) => {
  // TODO: Use an OR operation
  if (!search) {
    return {}
  }
  if (search.match(/^\d{1,10}$/)) {
    return {
      recipient: {
        [Op.like]: `%${search}%`,
      },
    }
  }
  return {
    params: {
      recipient_name: {
        [Op.iLike]: `%${search}%`,
      },
    },
  }
}

export const listMessages = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { campaignId } = req.params
  const { offset, limit, search } = req.query
  const searchOptions = generateSearchOptions(search as string)
  const { rows, count } = await GovsgMessage.findAndCountAll({
    where: {
      campaignId: +campaignId,
      ...searchOptions,
    },
    offset: +(offset as string),
    limit: +(limit as string),
    order: [['id', 'ASC']],
    include: [
      {
        model: GovsgVerification,
        attributes: ['passcode', 'userClickedAt'],
      },
    ],
  })
  const messages = rows.map((row) => {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      agency,
      recipient,
      officer_name,
      recipient_name,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      officer_designation,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      passcode,
      ...remainingParams
    } = row.params as Record<string, string>
    return {
      ...row.get({ plain: true }),
      name: recipient_name,
      mobile: recipient,
      data: JSON.stringify(remainingParams),
      passcode: row.govsgVerification?.passcode,
      sent: row.sentAt,
      officer: officer_name,
    }
  })
  return res.json({
    messages,
    total_count: count,
    has_passcode: !!rows[0]?.govsgVerification?.passcode,
  })
}

const getWhatsAppLanguageFromLanguageCode = (govsgMessage: GovsgMessage) => {
  const key = Object.keys(WhatsAppLanguages).find(
    (lang: string) =>
      WhatsAppLanguages[lang as keyof typeof WhatsAppLanguages] ===
      govsgMessage.languageCode
  )
  return key
    ? WhatsAppLanguages[key as keyof typeof WhatsAppLanguages]
    : WhatsAppLanguages.english
}

export const resendMessage = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { govsg_message_id: govsgMessageId } = req.body
  const govsgMessage = await GovsgMessage.findByPk(govsgMessageId)
  if (!govsgMessage) {
    return res.status(404).json({
      code: 'not_found',
      message: `GovsgMessage with ID ${govsgMessageId} doesn't exist.`,
    })
  }
  const campaignGovsgTemplate = await CampaignGovsgTemplate.findOne({
    where: {
      campaignId: govsgMessage.campaignId,
    },
    include: [Campaign, GovsgTemplate],
  })
  if (
    !campaignGovsgTemplate ||
    !campaignGovsgTemplate.govsgTemplate.whatsappTemplateLabel
  ) {
    return res.status(404).json({
      code: 'not_found',
      message: `Unable to get message template label with campaign_id ${govsgMessage.campaignId}.`,
    })
  }
  const { recipient } = govsgMessage
  // flamingoDb numbers are prepended with +countrycode and have no whitespaces.
  // recipient numbers of govsgMessage may not fulfil the above thus have to be preprocessed first.
  const normalisedRecipient = PhoneNumberService.normalisePhoneNumber(recipient)
  const apiClientIdMap = await whatsappService.flamingoDbClient.getApiClientId([
    normalisedRecipient,
  ])
  // if recipient not in db, map.get(recipient) will return undefined
  // default to clientTwo in this case
  const apiClient =
    apiClientIdMap.get(normalisedRecipient) ?? WhatsAppApiClient.clientTwo
  const params = govsgMessage.params as Record<string, string>
  const govsgVerification = await GovsgVerification.findOne({
    where: {
      govsgMessageId,
    },
  })
  if (govsgVerification) {
    params.passcode = govsgVerification.passcode
  }
  const paramsOrder = campaignGovsgTemplate.govsgTemplate.params ?? []
  const normalisedParams = WhatsAppClient.transformNamedParams(
    params as { [key: string]: string },
    paramsOrder
  )
  const language = getWhatsAppLanguageFromLanguageCode(govsgMessage)
  const templateMessageToSend: WhatsAppTemplateMessageToSend = {
    recipient: normalisedRecipient,
    apiClient,
    templateName: campaignGovsgTemplate.govsgTemplate.whatsappTemplateLabel,
    params: normalisedParams,
    language,
  }
  const serviceProviderMessageId = await sendMessage(templateMessageToSend)
  await govsgMessage.update({ serviceProviderMessageId })
  return res.json({
    wamid: serviceProviderMessageId,
  })
}

export const trackPasscodeReveal = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { govsg_message_id: govsgMessageId } = req.body
  const userClickedAt = new Date()
  await GovsgVerification.update(
    { userClickedAt },
    {
      where: {
        govsgMessageId,
        userClickedAt: {
          [Op.eq]: null,
        },
      },
    }
  )
  return res.json({
    govsg_message_id: govsgMessageId,
  })
}
