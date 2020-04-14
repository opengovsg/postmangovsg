import { Credential, Campaign } from '@core/models'

const insertCredential = async (hash: string) => {
  await Credential.create({
    name: hash,
  })
}

const updateCampaignWithCredential = async (campaignId: string, credentialName: string) => {
  return Campaign.update({
    credName: credentialName,
  },{
    where: {id: campaignId},
    returning: false
  })
}

const isExistingCredential = async (name: string): Promise<Boolean> => {
  const result = await Credential.findOne({
    where: {
      name: name
    },
  })
  if (result) return true
  return false
}

export const dbService = { insertCredential, updateCampaignWithCredential, isExistingCredential }