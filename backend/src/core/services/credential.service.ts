import AWS from 'aws-sdk'
import { get } from 'lodash'

import logger from '@core/logger'
import config from '@core/config'
import { ChannelType } from '@core/constants'
import { Credential, UserCredential, User } from '@core/models'
import { configureEndpoint } from '@core/utils/aws-endpoint'

import { TwilioCredentials } from '@sms/interfaces'
import { UserSettings } from '@core/interfaces'

const secretsManager = new AWS.SecretsManager(configureEndpoint(config))

/**
 * Checks if the credential has been saved
 * @param name
 */
const isExistingCredential = async (name: string): Promise<boolean> => {
  const result = await Credential.findOne({
    where: {
      name: name,
    },
    useMaster: true,
  })
  return !!result
}

/**
 * Save a credential into secrets manager and the credential table
 * @param name
 * @param secret
 */
const storeCredential = async (name: string, secret: string): Promise<void> => {
  // If credential exists, no need to store it again
  if (await isExistingCredential(name)) {
    return
  }

  // If credential doesn't exist, upload credential to secret manager, unless in development
  if (!config.get('IS_PROD')) {
    logger.info(
      `Dev env - skip storing credential in AWS secrets manager for name=${name}`
    )
  } else {
    const params = {
      Name: name,
      SecretString: secret,
    }
    logger.info('Storing credential in AWS secrets manager')
    await secretsManager.createSecret(params).promise()
    logger.info('Successfully stored credential in AWS secrets manager')
  }

  logger.info('Storing credential in DB')
  await Credential.findCreateFind({
    where: { name },
  })
  logger.info('Successfully stored credential in DB')
}

/**
 * Retrieve a credential from secrets amanger
 * @param name
 */
const getTwilioCredentials = async (
  name: string
): Promise<TwilioCredentials> => {
  if (!config.get('IS_PROD')) {
    logger.info(
      `Dev env - getTwilioCredentials - returning default credentials for name=${name}`
    )
    return config.get('smsOptions')
  }
  logger.info('Getting secret from AWS secrets manager.')
  const data = await secretsManager.getSecretValue({ SecretId: name }).promise()
  logger.info('Gotten secret from AWS secrets manager.')
  const secretString = get(data, 'SecretString', '')
  if (!secretString)
    throw new Error('Missing secret string from AWS secrets manager.')
  return JSON.parse(secretString)
}

/**
 * Creates a label for the credential, associated with a user
 * @param label
 * @param type
 * @param credName
 * @param userId
 */
const createUserCredential = (
  label: string,
  type: ChannelType,
  credName: string,
  userId: number
): Promise<UserCredential> => {
  return UserCredential.create({
    label,
    type,
    credName,
    userId,
  })
}

/**
 * Deletes the credential label for a user
 * @param userId
 * @param label
 */
const deleteUserCredential = (
  userId: number,
  label: string
): Promise<number> => {
  return UserCredential.destroy({
    where: {
      userId,
      label,
    },
  })
}

/**
 * Checks if a user already has this credential label associated with them
 * @param userId
 * @param label
 */
const getUserCredential = (
  userId: number,
  label: string
): Promise<UserCredential> => {
  return UserCredential.findOne({
    where: {
      userId,
      label,
    },
    attributes: ['credName'],
    useMaster: true,
  })
}

/**
 * Gets only the sms credential labels for that user
 * @param userId
 */
const getSmsUserCredentialLabels = async (
  userId: number
): Promise<string[]> => {
  const creds = await UserCredential.findAll({
    where: {
      type: ChannelType.SMS,
      userId: userId,
    },
    attributes: ['label'],
    useMaster: true,
  })
  return creds.map((c) => c.label)
}

/**
 * Gets api keys and credential labels for that user
 * @param userId
 */
const getUserSettings = async (
  userId: number
): Promise<UserSettings | null> => {
  const user = await User.findOne({
    where: {
      id: userId,
    },
    attributes: ['apiKey'],
    // include as 'creds'
    include: [
      {
        model: UserCredential,
        attributes: ['label', 'type'],
      },
    ],
    plain: true,
    useMaster: true,
  })
  if (user) {
    return { hasApiKey: !!user.apiKey, creds: user.creds }
  } else {
    return null
  }
}

/**
 * Gnerates an api key for the specified user
 * @param userId
 * @throws Error if user is not found
 */
const regenerateApiKey = async (userId: number): Promise<string> => {
  const user = await User.findByPk(userId, { useMaster: true })
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
