import AWS from 'aws-sdk'
import { get } from 'lodash'

import logger from '@core/logger'
import config from '@core/config'
import { ChannelType } from '@core/constants'
import { Credential, UserCredential, User } from '@core/models'

import { TwilioCredentials } from '@sms/interfaces'
import { UserSettings } from '@core/interfaces'

const secretsManager = new AWS.SecretsManager({ region: config.aws.awsRegion })

const isExistingCredential = async (name: string): Promise<boolean> => {
  const result = await Credential.findOne({
    where: {
      name: name,
    },
  })
  return !!result
}

const storeCredential = async (name: string, secret: string): Promise<void> => {
  if (!config.IS_PROD) {
    logger.info(`Dev env - storeSecret - skipping for name=${name}`)
    return
  }

  // If credentials exists, skip
  if (await isExistingCredential(name)) {
    return
  }

  const params = {
    Name: name,
    SecretString: secret,
  }
  logger.info('Storing credential in AWS secrets manager')
  await secretsManager.createSecret(params).promise()
  logger.info('Successfully stored credential in AWS secrets manager')
  logger.info('Storing credential in DB')
  await Credential.findCreateFind({
    where: { name },
  })
  logger.info('Successfully stored credential in DB')
}

const getTwilioCredentials = async (name: string): Promise<TwilioCredentials> => {
  if (!config.IS_PROD) {
    logger.info(`Dev env - getTwilioCredentials - returning default credentials for name=${name}`)
    return config.smsOptions
  }
  logger.info('Getting secret from AWS secrets manager.')
  const data = await secretsManager.getSecretValue({ SecretId: name }).promise()
  logger.info('Gotten secret from AWS secrets manager.')
  const secretString = get(data, 'SecretString', '')
  if (!secretString) throw new Error('Missing secret string from AWS secrets manager.')
  return JSON.parse(secretString)
}



const createUserCredential = (label: string, type: ChannelType, credName: string, userId: number): Promise<UserCredential> => {
  return UserCredential.create({
    label, type, credName, userId,
  })
}

const deleteUserCredential = (userId: number, label: string): Promise<number> => {
  return UserCredential.destroy({
    where: {
      userId,
      label,
    },
  })
}

const getUserCredential = (userId: number, label: string): Promise<UserCredential> => {
  return UserCredential.findOne({
    where: {
      userId,
      label,
    },
    attributes: ['credName'],
  })
}

const getSmsUserCredentialLabels = async (userId: number): Promise<string[]> => {
  const creds = await UserCredential.findAll({
    where: {
      type: ChannelType.SMS,
      userId: userId,
    },
    attributes: ['label'],
  })
  return creds.map(c => c.label)
}

const getUserSettings = async (userId: number): Promise<UserSettings | null> => {
  const user = await User.findOne({
    where: {
      id: userId,
    },
    attributes: ['apiKey'],
    // include as 'creds'
    include: [{
      model: UserCredential,
      attributes: ['label', 'type'],
    }],
    plain: true,
  })
  if(user){
    return { hasApiKey: !!user.apiKey, creds: user.creds }
  } else{
    return null
  }
}

/**
 * Gnerates an api key for the specified user
 * @param userId 
 * @throws Error if user is not found
 */
const regenerateApiKey = async (userId: number): Promise<string> => {
  const user = await User.findByPk(userId)
  if (!user) {
    throw new Error('User not found')
  }
  return user.regenerateAndSaveApiKey()
}

export const CredentialService = {
  // Credentials (cred_name)
  isExistingCredential,
  storeCredential,
  getTwilioCredentials,
  // User credentials (user - label - cred_name)
  createUserCredential,
  deleteUserCredential,
  getUserCredential,
  getSmsUserCredentialLabels,
  getUserSettings,
  // Api Key
  regenerateApiKey,
}