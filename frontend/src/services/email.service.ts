import axios from 'axios'
export async function saveTemplate(campaignId: number, subject: string, body: string): Promise<boolean> {
  return axios.put(`/campaign/${campaignId}/template`,{
    body,
    subject,
  }).then((response) => {
    return response.status === 200
  })
}

export async function getPreviewMessage(campaignId: number): Promise<string> {
  return Promise.resolve('something hola')
}

export async function sendCampaign(campaignId: number): Promise<boolean> {
  return Promise.resolve(true)
}