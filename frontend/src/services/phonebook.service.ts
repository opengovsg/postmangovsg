import axios, { AxiosError } from 'axios'

import { AgencyList, ChannelType } from 'classes'
import { REACT_APP_PHONEBOOK_ENABLE_AUTO_UNSUBSCRIBE } from 'config'

export function isPhonebookAutoUnsubscribeEnabled(): boolean {
  return REACT_APP_PHONEBOOK_ENABLE_AUTO_UNSUBSCRIBE === 'true'
}

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
}): Promise<{
  list_id: number
}> {
  try {
    return axios.post(`/campaign/${campaignId}/phonebook-list`, {
      list_id: listId,
    })
  } catch (e) {
    errorHandler(e, 'Error selecting list')
  }
}

/**
 * Associate a phonebook list with a campaign.
 * Calling this API would mean that a particular campaign is using a particular phonebook list.
 */
export async function setPhonebookListForCampaign({
  campaignId,
  listId,
}: {
  campaignId: number
  listId: number
}) {
  try {
    return axios.put(`/campaign/${campaignId}/phonebook-associations`, {
      list_id: listId,
    })
  } catch (e) {
    errorHandler(e, 'Error setting association between campaign and list')
  }
}

/**
 * Delete the association between a phonebook list and a campaign.
 * Calling this API would mean the campaign is no longer using a phonebook list.
 */
export async function deletePhonebookListForCampaign(campaignId: number) {
  try {
    return axios.delete(`/campaign/${campaignId}/phonebook-associations`)
  } catch (e) {
    errorHandler(e, 'Error deleting the association between campaign and list')
  }
}

/**
 * Determines if the current campaign is using a Phonebook list.
 * If it is, return the list Id. Otherwise, return undefined.
 */
export async function getPhonebookListIdForCampaign(
  campaignId: number
): Promise<number | undefined> {
  try {
    const response = await axios.get(`/campaign/${campaignId}/phonebook-listid`)
    return response.data?.list_id
  } catch (e) {
    errorHandler(e, 'Error getting managed list of campaign')
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
