import { Request, Response } from 'express'
import { whatsappService } from '@core/services/whatsapp.service'
import { GovsgMessage } from '@govsg/models'
import { GovsgVerification } from '@govsg/models/govsg-verification'
import { WhatsAppApiClient } from '@shared/clients/whatsapp-client.class/types'
import { sendPasscodeCreationMessage } from '@govsg/services/govsg-verification-service'
import { Op } from 'sequelize'
import { PhoneNumberService } from '@shared/utils/phone-number.service'

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
  if (count > 0) {
    const row = rows[0]
    return res.json({
      messages,
      total_count: count,
      has_passcode: !!row.govsgVerification?.passcode,
    })
  }
  return res.json({
    messages,
    total_count: count,
    has_passcode: !!rows[0]?.govsgVerification?.passcode,
  })
}

export const resendPasscodeCreationMessage = async (
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
  const govsgVerification = await GovsgVerification.findOne({
    where: {
      govsgMessageId,
    },
  })
  if (!govsgVerification) {
    return res.status(404).json({
      code: 'not_found',
      message: `GovsgVerification with govsg_message_id ${govsgMessageId} doesn't exist.`,
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
  const apiClientId =
    apiClientIdMap.get(normalisedRecipient) ?? WhatsAppApiClient.clientTwo
  const passcodeCreationWamid = await sendPasscodeCreationMessage(
    recipient,
    apiClientId
  )
  await govsgVerification.update({ passcodeCreationWamid })
  return res.json({
    passcode_creation_wamid: passcodeCreationWamid,
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
    user_clicked_at: userClickedAt,
  })
}
