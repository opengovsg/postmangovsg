import AWS from 'aws-sdk'
import { Credential, Campaign } from '@core/models'
import logger from '@core/logger'
import config from '@core/config'
import { TwilioCredentials } from '@sms/interfaces'
import { get } from 'lodash'

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
    where: { id: campaignId },
    returning: false,
  })
}

const isExistingCredential = async (name: string): Promise<boolean> => {
  const result = await Credential.findOne({
    where: {
      name: name,
    },
  })
  if (result) return true
  return false
}

const storeSecret = async (name: string, secret: string) => {
  const params = {
    Name: name,
    SecretString: secret,
  }
  logger.info('Storing secret in AWS secrets manager.')
  await secretsManager.createSecret(params).promise()
  logger.info('Successfully stored secret in AWS secrets manager.')
}

const getTwilioCredentials = async (name: string): Promise<TwilioCredentials> => {
  logger.info('Getting secret from AWS secrets manager.')
  const data = await secretsManager.getSecretValue({ SecretId: name }).promise()
  logger.info('Gotten secret from AWS secrets manager.')
  const secretString = get(data, 'SecretString', '')
  if (!secretString) throw new Error('Missing secret string from AWS secrets manager.')
  return JSON.parse(secretString)
}

export const credentialService = {
  insertCredential,
  updateCampaignWithCredential,
  isExistingCredential,
  storeSecret,
  getTwilioCredentials,
}