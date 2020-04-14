import { Credential, Campaign } from '@core/models'

const insertIntoCredentialsTable = async (hash: string): Promise<Credential> => {
  return Credential.create({
    name: hash,
  })
}

const addCredentialToCampaignTable = async (campaignId: string, credentialName: string) => {
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

export const dbService = { insertIntoCredentialsTable, addCredentialToCampaignTable, isExistingCredential }