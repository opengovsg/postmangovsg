import AWS from 'aws-sdk'
import { Credential, Campaign } from '@core/models'
import logger from '@core/logger'
import config from '@core/config'
import { TwilioCredentials } from '@sms/interfaces'
import { get } from 'lodash'

const secretsManager = new AWS.SecretsManager({ region: config.aws.awsRegion })

const addCredentialToCampaign = async (campaignId: number, credentialName: string): Promise <void> => {
  const transaction = await Credential.sequelize?.transaction()
  try{
    // Insert the credential name into credential table if it does not exist
    await Credential.findCreateFind({ 
      where: {
        name: credentialName,
      },
      transaction,
    })
    // Update campaign with the credential name
    await Campaign.update({
      credName: credentialName,
    },{
      where: { id: campaignId },
      returning: false,
      transaction,
    })
    transaction?.commit()
  }
  catch(err){
    transaction?.rollback()
    throw err
  }
 
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

const storeSecret = async (name: string, secret: string): Promise<void> => {
  if(!config.IS_PROD){
    logger.info(`Dev env - storeSecret - skipping for name=${name}`)
    return
  }
  const params = {
    Name: name,
    SecretString: secret,
  }
  logger.info('Storing secret in AWS secrets manager.')
  await secretsManager.createSecret(params).promise()
  logger.info('Successfully stored secret in AWS secrets manager.')
}

const getTwilioCredentials = async (name: string): Promise<TwilioCredentials> => {
  if(!config.IS_PROD){
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

export const credentialService = {
  addCredentialToCampaign,
  isExistingCredential,
  storeSecret,
  getTwilioCredentials,
}