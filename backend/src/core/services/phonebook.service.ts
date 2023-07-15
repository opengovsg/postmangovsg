import { loggerWithLabel } from '@core/logger'
import { ChannelType } from '@core/constants'
import PhonebookClient from '@shared/clients/phonebook-client.class'
import config from '@core/config'
import { ManagedListCampaign, User } from '@core/models'

const logger = loggerWithLabel(module)

const phonebookClient: PhonebookClient = new PhonebookClient(
  config.get('phonebook.endpointUrl'),
  config.get('phonebook.apiKey')
)

const getPhonebookLists = async ({
  userId,
  channel,
}: {
  userId: number
  channel: ChannelType
}): Promise<{ id: number; name: string }[]> => {
  try {
    const user = await User.findOne({
      where: { id: userId },
      attributes: ['email'],
    })
    if (!user) {
      logger.error('invalid user making request!')
      return []
    }
    const res = await phonebookClient.getManagedLists(user.email, channel)

    return res
  } catch (err) {
    logger.error({
      action: 'getPhonebookLists',
      message: err,
    })
    throw err
  }
}

const getPhonebookListById = async ({
  listId,
  presignedUrl,
}: {
  listId: number
  presignedUrl: string
}): Promise<{ s3Key: string; etag: string; filename: string }> => {
  try {
    return await phonebookClient.getManagedListById(listId, presignedUrl)
  } catch (err) {
    logger.error({
      action: 'getPhonebookListById',
      message: err,
    })
    throw err
  }
}

const setPhonebookListForCampaign = async ({
  campaignId,
  listId,
}: {
  campaignId: number
  listId: number
}) => {
  return await ManagedListCampaign.upsert({
    campaignId,
    managedListId: listId,
  } as ManagedListCampaign)
}

const deletePhonebookListForCampaign = async (campaignId: number) => {
  return await ManagedListCampaign.destroy({
    where: {
      campaignId,
    },
  })
}

const getPhonebookListIdForCampaign = async (campaignId: number) => {
  const managedListCampaign = await ManagedListCampaign.findOne({
    where: {
      campaignId,
    },
  })
  return managedListCampaign?.managedListId
}

export const PhonebookService = {
  getPhonebookLists,
  getPhonebookListById,
  setPhonebookListForCampaign,
  deletePhonebookListForCampaign,
  getPhonebookListIdForCampaign,
}
