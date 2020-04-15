import AWS from 'aws-sdk'
import { Credential, Campaign } from '@core/models'
import logger from '@core/logger'
import config from '@core/config'

const secretsManager = new AWS.SecretsManager({ region: config.aws.awsRegion })

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

const storeSecret = async (name: string, secret: string) => {
  const params = {
    Name: name,
    SecretString: secret
  }
  logger.info('Storing secret in AWS secrets manager.')
  await secretsManager.createSecret(params).promise()
  logger.info('Successfully stored secret in AWS secrets manager.')
}


export const credentialService = {
  insertCredential,
  updateCampaignWithCredential,
  isExistingCredential,
  storeSecret
}