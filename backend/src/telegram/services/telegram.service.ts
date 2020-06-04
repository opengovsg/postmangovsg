import { literal } from 'sequelize'

import { ChannelType } from '@core/constants'
import { Campaign, JobQueue } from '@core/models'
import { GetCampaignDetailsOutput, CampaignDetails } from '@core/interfaces'

import { TelegramMessage, TelegramTemplate } from '@telegram/models'

/**
 *  Helper method to find a telegram campaign owned by that user
 * @param campaignId
 * @param userId
 */
const findCampaign = (
  campaignId: number,
  userId: number
): Promise<Campaign> => {
  return Campaign.findOne({
    where: { id: +campaignId, userId, type: ChannelType.Telegram },
  })
}

/**
 * Update the credential column for the campaign with the specified credential
 * @param campaignId
 * @param credentialName
 */
const setCampaignCredential = (
  campaignId: number,
  credentialName: string
): Promise<[number, Campaign[]]> => {
  return Campaign.update(
    { credName: credentialName },
    {
      where: { id: campaignId },
      returning: false,
    }
  )
}

/**
 * Gets details of a campaign and the number of recipients that have been uploaded for this campaign
 * @param campaignId
 */
const getCampaignDetails = async (
  campaignId: number
): Promise<GetCampaignDetailsOutput> => {
  const campaignDetails: CampaignDetails = (
    await Campaign.findOne({
      where: { id: +campaignId },
      attributes: [
        'id',
        'name',
        'type',
        'created_at',
        'valid',
        [
          literal('CASE WHEN "cred_name" IS NULL THEN False ELSE True END'),
          'has_credential',
        ],
        [literal("s3_object -> 'filename'"), 'csv_filename'],
      ],
      include: [
        {
          model: JobQueue,
          attributes: ['status', ['created_at', 'sent_at']],
        },
        {
          model: TelegramTemplate,
          attributes: ['body', 'params'],
        },
      ],
    })
  )?.get({ plain: true }) as CampaignDetails

  const numRecipients: number = await TelegramMessage.count({
    where: { campaignId: +campaignId },
  })
  return { campaign: campaignDetails, numRecipients }
}

export const TelegramService = {
  findCampaign,
  getCampaignDetails,
  setCampaignCredential,
}
