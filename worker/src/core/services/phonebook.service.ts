import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import PhonebookClient from '@shared/clients/phonebook-client.class'
import {
  PhonebookChannelDto,
  UserChannel,
} from '@shared/clients/phonebook-client.class/interfaces'

const logger = loggerWithLabel(module)

const phonebookClient: PhonebookClient = new PhonebookClient(
  config.get('phonebook.endpointUrl'),
  config.get('phonebook.apiKey'),
  config.get('phonebook.version')
)

const getUniqueLinksByUsers = async () => {
  logger.info({ message: 'getting unique links', phonebookClient })
  const channels: UserChannel[] = []
  const payload: PhonebookChannelDto = {
    userChannels: channels,
    postmanCampaignOwner: 'test',
  }

  return await phonebookClient.getUniqueLinksForUsers(payload)
}
export const PhonebookService = {
  getUniqueLinksByUsers,
}
