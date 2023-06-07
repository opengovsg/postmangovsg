import { loggerWithLabel } from '@core/logger'
import { ChannelType } from '@core/constants'
import PhonebookClient from '@shared/clients/phonebook-client.class'
import config from '@core/config'
import { User } from '@core/models'

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
}: {
  listId: number
}): Promise<any> => {
  try {
    return await phonebookClient.getManagedListById(listId)
  } catch (err) {
    logger.error({
      action: 'getPhonebookListById',
      message: err,
    })
    throw err
  }
}

export const PhonebookService = {
  getPhonebookLists,
  getPhonebookListById,
}
