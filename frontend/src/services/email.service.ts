export async function getPreviewMessage(campaignId: number): Promise<string> {
  return Promise.resolve('something hola')
}

export async function sendCampaign(campaignId: number): Promise<boolean> {
  return Promise.resolve(true)
}