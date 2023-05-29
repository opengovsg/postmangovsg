import axios, { AxiosError } from 'axios'

import { AgencyList, ChannelType } from 'classes'

export async function getPhonebookListsByChannel({
  channel,
}: {
  channel: ChannelType
}): Promise<AgencyList[]> {
  try {
    const lists = (await axios.get(`/phonebook/lists/${channel}`)).data
      .lists as AgencyList[]
    return lists
  } catch (e) {
    errorHandler(e, 'Error getting phonebook lists')
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
