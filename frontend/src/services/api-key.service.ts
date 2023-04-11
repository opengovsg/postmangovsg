import axios from 'axios'

export interface ApiKey {
  id: string
  label: string
  last_five: string
  plain_text_key?: string
  valid_until: string
  notification_addresses: string[]
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const { data } = await axios.get('/api-key')
  return data as ApiKey[]
}

export async function generateApiKey({
  label,
  notificationAddresses,
}: {
  label: string
  notificationAddresses: string[]
}): Promise<ApiKey> {
  const { data } = await axios.post('/api-key', {
    label,
    notification_addresses: notificationAddresses,
  })
  return data as ApiKey
}

export async function updateApiKey({
  id,
  notificationAddresses,
}: {
  id: string
  notificationAddresses: string[]
}): Promise<ApiKey> {
  const { data } = await axios.put(`/api-key/${id}`, {
    notification_addresses: notificationAddresses,
  })
  return data as ApiKey
}

export async function deleteApiKey(keyId: string): Promise<void> {
  await axios.delete(`/api-key/${keyId}`)
}
