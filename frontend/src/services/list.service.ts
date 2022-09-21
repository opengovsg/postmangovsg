import axios, { AxiosError } from 'axios'

import { ChannelType, List } from 'classes'

export async function selectList({
  campaignId,
  listId,
}: {
  campaignId: number
  listId: number
}): Promise<void> {
  try {
    return await axios.post(`/campaign/${campaignId}/select-list`, {
      list_id: listId,
    })
  } catch (e) {
    errorHandler(e, 'Error selecting list')
  }
}

export async function getListsByChannel({
  channel,
}: {
  channel: ChannelType
}): Promise<List[]> {
  try {
    const lists = (await axios.get(`/lists/${channel}`)).data.lists as List[]
    return lists
  } catch (e) {
    errorHandler(e, 'Error getting lists')
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
