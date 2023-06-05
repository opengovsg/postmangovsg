import axios, { AxiosError } from 'axios'

import { AgencyList, ChannelType } from 'classes'

export async function getPhonebookListsByChannel({
  channel,
}: {
  channel: ChannelType
}): Promise<AgencyList[]> {
  try {
    return (await axios.get(`/phonebook/lists/${channel}`)).data
      .lists as AgencyList[]
  } catch (e) {
    errorHandler(e, 'Error getting phonebook lists')
  }
}

export async function selectPhonebookList({
  campaignId,
  listId,
}: {
  campaignId: number
  listId: number
}): Promise<void> {
  try {
    return await axios.post(`/campaign/${campaignId}/phonebook-list`, {
      list_id: listId,
    })
  } catch (e) {
    errorHandler(e, 'Error selecting list')
  }
}

function errorHandler(e: unknown, defaultMsg?: string): never {
  console.error(e)
  if (
    axios.isAxiosError(e) &&
    e.response &&
    e.response.data &&
    e.response.data.message
  ) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg || (e as AxiosError).response?.statusText)
}
