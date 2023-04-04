import AWS from 'aws-sdk'
import { get } from 'lodash'

import config from '@core/config'
import { ChannelType } from '@core/constants'
import {
  Credential,
  User,
  UserCredential,
  UserDemo,
  UserFeature,
} from '@core/models'
import { configureEndpoint } from '@core/utils/aws-endpoint'
import { loggerWithLabel } from '@core/logger'
import { UserSettings } from '@core/interfaces'
import { RedisService } from './redis.service'
import { TwilioCredentials } from '@shared/clients/twilio-client.class'
import { ApiKeyService } from './api-key.service'
import { ApiKey } from '@core/models/user/api-key'

export interface CredentialService {
  // Credentials (cred_name)
  storeCredential(
    name: string,
    secret: string,
    restrictEnvironment: boolean
  ): Promise<void>

  getTwilioCredentials(name: string): Promise<TwilioCredentials>

  getTelegramCredential(name: string): Promise<string>

  // User credentials (user - label - cred_name)
  createUserCredential(
    label: string,
    type: ChannelType,
    credName: string,
    userId: number
  ): Promise<UserCredential>

  deleteUserCredential(userId: number, label: string): Promise<number>

  getUserCredential(
    userId: number,
    label: string
  ): Promise<UserCredential | null>

  getSmsUserCredentialLabels(userId: number): Promise<string[]>

  getTelegramUserCredentialLabels(userId: number): Promise<string[]>

  getUserSettings(userId: number): Promise<UserSettings | null>

  // User metadata
  updateDemoDisplayed(
    userId: number,
    isDisplayed: boolean
  ): Promise<{ isDisplayed: boolean }>

  updateAnnouncementVersion(
    userId: number,
    announcementVersion: string | null
  ): Promise<{ announcementVersion: string }>

  generateApiKey(
    userId: number,
    label: string
  ): Promise<ApiKey & { plainTextKey: string }>
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const InitCredentialService = (redisService: RedisService) => {
  const secretsManager = new AWS.SecretsManager(configureEndpoint(config))
  const logger = loggerWithLabel(module)

  /**
   * Upserts credential into AWS SecretsManager
   * @param name
   * @param secret
   * @param restrictEnvironment
   * @throws error if update fails
   */
  const upsertCredential = async (
    name: string,
    secret: string,
    restrictEnvironment: boolean
  ): Promise<void> => {
    const logMeta = { name, action: 'upsertCredential' }
    // If credential doesn't exist, upload credential to secret manager
    try {
      await secretsManager
        .createSecret({
          Name: name,
          SecretString: secret,
          ...(restrictEnvironment
            ? { Tags: [{ Key: 'environment', Value: config.get('env') }] }
            : {}),
        })
        .promise()
      logger.info({
        message: 'Successfully stored credential in AWS secrets manager',
        ...logMeta,
      })
    } catch (err) {
      if ((err as Error).name === 'ResourceExistsException') {
        await secretsManager
          .putSecretValue({
            SecretId: name,
            SecretString: secret,
          })
          .promise()
        logger.info({
          message: 'Successfully updated credential in AWS secrets manager',
          error: err,
          ...logMeta,
        })
      } else {
        logger.error({
          message: 'Failed to store credential in AWS secrets manager',
          error: err,
          ...logMeta,
        })
        throw err
      }
    }
    return
  }

  /**
   * Save a credential into secrets manager and the credential table
   * @param name
   * @param secret
   * @param restrictEnvironment
   */
  const storeCredential = async (
    name: string,
    secret: string,
    restrictEnvironment = false
  ): Promise<void> => {
    const logMeta = { name, action: 'storeCredential' }
    // If adding a credential to secrets manager throws an error, db will not be updated
    // If adding a credential to secrets manager succeeds, but the db call fails, it is ok because the credential will not be associated with a campaign
    // It results in orphan secrets manager credentials, which is acceptable.
    await upsertCredential(name, secret, restrictEnvironment)
    await Credential.findCreateFind({
      where: { name },
    })
    logger.info({ message: 'Successfully stored credential in DB', ...logMeta })
  }

  /**
   * Retrieve a credential from secrets manager
   * @param name
   */
  const getTwilioCredentials = (name: string): Promise<TwilioCredentials> => {
    const logMeta = { name, action: 'getTwilioCredentials' }

    return new Promise((resolve, reject) => {
      redisService.credentialClient.get(name, async (error, value) => {
        if (error || value === null) {
          const data = await secretsManager
            .getSecretValue({ SecretId: name })
            .promise()
          logger.info({
            message: 'Retrieved secret from AWS secrets manager.',
            ...logMeta,
          })

          if (!data?.SecretString) {
            reject(new Error('Missing secret string from AWS secrets manager.'))
            return
          }
          value = data?.SecretString

          redisService.credentialClient.set(
            name,
            value,
            'PX',
            config.get('twilioCredentialCache.maxAge'),
            (error) => {
              if (error) {
                logger.error({
                  message: 'Failed to save Twilio credential',
                  error,
                  ...logMeta,
                })
              }
            }
          )
        }
        resolve(JSON.parse(value))
      })
    })
  }

  /**
   * Retrieve Telegram credentials from secrets manager
   * @param name
   */
  const getTelegramCredential = async (name: string): Promise<string> => {
    const logMeta = { name, action: 'getTelegramCredential' }
    const data = await secretsManager
      .getSecretValue({ SecretId: name })
      .promise()
    logger.info({
      message: 'Retrieved secret from AWS secrets manager.',
      ...logMeta,
    })
    const secretString = get(data, 'SecretString', '')
    if (!secretString) {
      throw new Error('Missing secret string from AWS secrets manager.')
    }
    return secretString
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
    } as UserCredential)
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
  ): Promise<UserCredential | null> => {
    return UserCredential.findOne({
      where: {
        userId,
        label,
      },
      attributes: ['credName'],
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
    })
    return creds.map((c) => c.label)
  }

  /**
   * Gets only the telegram credential labels for that user
   * @param userId
   */
  const getTelegramUserCredentialLabels = async (
    userId: number
  ): Promise<string[]> => {
    const creds = await UserCredential.findAll({
      where: {
        type: ChannelType.Telegram,
        userId: userId,
      },
      attributes: ['label'],
    })
    return creds.map((c) => c.label)
  }

  /**
   * Gets api keys and credential labels for that user
   * @param userId
   */
  // TODO: refactor demo and announcement version features out
  const getUserSettings = async (
    userId: number
  ): Promise<UserSettings | null> => {
    const user = await User.findOne({
      where: {
        id: userId,
      },
      // include as 'creds'
      include: [
        {
          model: UserCredential,
          attributes: ['label', 'type'],
        },
        {
          model: UserDemo,
          attributes: [
            ['num_demos_sms', 'numDemosSms'],
            ['num_demos_telegram', 'numDemosTelegram'],
            ['is_displayed', 'isDisplayed'],
          ],
        },
        {
          model: UserFeature,
          attributes: [['announcement_version', 'announcementVersion']],
        },
      ],
      plain: true,
    })
    if (user) {
      return {
        creds: user.creds,
        demo: user.demo,
        userFeature: user.userFeature,
      }
    } else {
      return null
    }
  }

  const generateApiKey = async (
    userId: number,
    label: string
  ): Promise<ApiKey & { plainTextKey: string }> => {
    const user = await User.findByPk(userId)
    if (!user) {
      throw new Error('User not found')
    }
    const name = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '')
    const plainTextKey = ApiKeyService.generateApiKeyFromName(name)
    const apiKeyHash = await ApiKeyService.getApiKeyHash(plainTextKey)
    const apiKey = await ApiKey.create({
      userId: user.id.toString(),
      hash: apiKeyHash,
      lastFive: plainTextKey.slice(-5),
      label,
    } as ApiKey)
    return Object.assign({}, apiKey.toJSON(), { plainTextKey })
  }

  const updateDemoDisplayed = async (
    userId: number,
    isDisplayed: boolean
  ): Promise<{ isDisplayed: boolean }> => {
    const [numUpdated, userDemo] = await UserDemo.update(
      { isDisplayed },
      {
        where: { userId },
        returning: true,
      }
    )
    if (numUpdated !== 1) {
      logger.error({
        message: 'Incorrect number of records updated',
        numUpdated,
        action: 'updateDemoDisplayed',
      })
      throw new Error('Could not update demo displayed')
    }
    return {
      isDisplayed: userDemo[0].isDisplayed,
    }
  }

  /**
   * Updates the announcement version for the specified user
   * @param userId
   * @param announcementVersion
   * @throws Error if user is not found
   */
  const updateAnnouncementVersion = async (
    userId: number,
    announcementVersion: string
  ): Promise<{ announcementVersion: string }> => {
    const [rowUpserted] = await UserFeature.upsert(
      {
        userId: userId,
        announcementVersion: announcementVersion,
      } as UserFeature,
      { returning: true }
    )

    if (!rowUpserted) {
      logger.error({
        message: 'No upserted row returned',
        action: 'updateAnnouncementVersion',
      })
      throw new Error('Could not update announcement version')
    }

    return {
      // safe to cast as we know the row was upserted
      announcementVersion: rowUpserted.announcementVersion as string,
    }
  }

  return {
    // Credentials (cred_name)
    storeCredential,
    getTwilioCredentials,
    getTelegramCredential,
    // User credentials (user - label - cred_name)
    createUserCredential,
    deleteUserCredential,
    getUserCredential,
    getSmsUserCredentialLabels,
    getTelegramUserCredentialLabels,
    getUserSettings,
    // User metadata
    updateDemoDisplayed,
    updateAnnouncementVersion,
    generateApiKey,
  }
}
