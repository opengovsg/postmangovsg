import axios from 'axios'

export interface ApiKey {
  id: string
  label: string
  lastFive: string
  createdAt: Date
  updatedAt: Date
  key?: string
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const { data } = await axios.get('/api-key')
  return data as ApiKey[]
}

export async function generateApiKey({
  label,
}: {
  label: string
}): Promise<ApiKey> {
  const { data } = await axios.post('/api-key', { label })
  return data as ApiKey
}

export async function deleteApiKey(keyId: string): Promise<void> {
  await axios.delete(`/api-key/${keyId}`)
}
