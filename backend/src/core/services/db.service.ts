import { Credential, Campaign } from '@core/models'

const insertIntoCredentialsTable = async (hash: string): Promise<Credential> => {
  return Credential.create({
    name: hash,
  })
}

const addCredentialToCampaignTable = async (campaignId: string, credentialName: string) => {
  return Campaign.update({
    cred_name: credentialName,
  },{
    where: {id: campaignId},
    returning: false
  })
}

export const dbService = { insertIntoCredentialsTable, addCredentialToCampaignTable }