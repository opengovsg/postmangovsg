import { Request, Response, NextFunction } from 'express'
import { ChannelType, DefaultCredentialName } from '@core/constants'
import { CredentialService } from '@core/services'
import { TelegramService } from '@telegram/services'
import { loggerWithLabel } from '@core/logger'
import { formatDefaultCredentialName } from '@core/utils'

const logger = loggerWithLabel(module)

const botId = (telegramBotToken: string): string =>
  telegramBotToken.split(':')[0]
/**
 * Parse telegram credentials from request body, setting it to res.locals.credentials to be passed downstream
 * @param req
 * @param res
 * @param next
 */
const getCredentialsFromBody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { telegram_bot_token: telegramBotToken } = req.body

  res.locals.credentials = { telegramBotToken }
  return next()
}

/**
 * Parse label from request body. Retrieve credentials associated with this label,
 * and set the credentials to res.locals.credentials to be passed downstream
 * @param req
 * @param res
 * @param next
 */
const getCredentialsFromLabel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { campaignId } = req.params
  const { label } = req.body
  const userId = req.session?.user?.id
  try {
    const logMeta = {
      label,
      action: 'getCredentialsFromLabel',
    }
    /* Determine if credential name can be used */
    let credentialName
    if (label === DefaultCredentialName.Telegram) {
      const campaign = await TelegramService.findCampaign(+campaignId, userId) // TODO: refactor this into res.locals
      if (campaign.demoMessageLimit) {
        credentialName = formatDefaultCredentialName(label)
      } else {
        logger.error({
          message: `Campaign not allowed to use label`,
          ...logMeta,
        })
        return res.status(400).json({
          message: `Campaign ${campaignId} is not allowed to use default credentials`,
        })
      }
    } else {
      // if label provided, fetch from aws secrets
      const userCred = await CredentialService.getUserCredential(+userId, label)

      if (!userCred) {
        logger.error({
          message: 'User credentials not found',
          ...logMeta,
        })
        return res
          .status(400)
          .json({ message: 'User credentials cannot be found' })
      }

      credentialName = userCred.credName
    }

    const telegramBotToken = await CredentialService.getTelegramCredential(
      credentialName
    )
    res.locals.credentials = { telegramBotToken }
    return next()
  } catch (err) {
    return next(err)
  }
}

/**
 * Retrieve credential for campaign
 * @param res
 * @param req
 * @param next
 */
const getCampaignCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const { campaignId } = req.params
  const userId = req.session?.user?.id
  const campaign = await TelegramService.findCampaign(+campaignId, userId)

  const { credName } = campaign
  if (!credName) {
    logger.error({
      message: 'Credential not found for this campaign',
      campaignId,
      credName,
      action: 'getCampaignCredential',
    })
    return res
      .status(400)
      .json({ message: 'No credentials found for this campaign.' })
  }

  const telegramBotToken = await CredentialService.getTelegramCredential(
    credName
  )

  res.locals.credentials = { telegramBotToken }
  next()
}

/**
 * Call Telegram API getMe to validate token. If the token is valid,
 * we will set the callback url and store the credentials in AWS
 * SecretsManager and db.
 * Set the credentialName and channelType in res.locals to be passed downstream
 * @param req
 * @param res
 */
const validateAndStoreCredentials = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { telegramBotToken } = res.locals.credentials
  const credentialName = botId(telegramBotToken)
  const logMeta = {
    credentialName,
    action: 'validateAndStoreCredentials',
  }
  try {
    await TelegramService.validateAndConfigureBot(telegramBotToken)
  } catch (err) {
    logger.error({
      message: 'Failed to validate and store credentials',
      error: err,
      ...logMeta,
    })
    return res.status(400).json({ message: `${err}` })
  }

  try {
    // Credential name will be raw botId. The botId will not be hashed as we
    // want to preserve the mapping between botId and token even in the event
    // of a change in salt for future token revocations/updates for the given
    // botId.

    await CredentialService.storeCredential(
      credentialName,
      telegramBotToken,
      true
    )
  } catch (err) {
    logger.error({
      message: 'Failed to validate and store credentials',
      error: err,
      ...logMeta,
    })
    return res.status(400).json({ message: 'Error storing credentials' })
  }

  // Pass on to next middleware/handler
  res.locals.channelType = ChannelType.Telegram
  next()
}

/**
 * Send validation message to recipient
 * @param req
 * @param res
 */
const sendValidationMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { campaignId } = req.params
  const { recipient } = req.body
  const { credentials } = res.locals
  const { telegramBotToken } = credentials
  const logMeta = { campaignId, recipient, action: 'sendValidationMessage' }

  try {
    if (!campaignId) {
      await TelegramService.sendValidationMessage(recipient, telegramBotToken)
    } else {
      await TelegramService.sendCampaignMessage(
        +campaignId,
        recipient,
        telegramBotToken
      )
    }
    logger.info({ message: 'Sent validation message', ...logMeta })
    return res.json({ message: 'OK' })
  } catch (err) {
    logger.info({
      message: 'Failed to send validation message',
      error: err,
      ...logMeta,
    })
    return res.status(400).json({ message: `${err.message}` })
  }
}

/**
 * Checks if the campaign id supplied is indeed a campaign of the 'TELEGRAM' type, and belongs to the user
 * @param req
 * @param res
 * @param next
 */
const isTelegramCampaignOwnedByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const userId = req.session?.user?.id
    const campaign = await TelegramService.findCampaign(+campaignId, userId)
    if (campaign) {
      return next()
    } else {
      return res.sendStatus(403)
    }
  } catch (err) {
    return next(err)
  }
}

/**
 * Gets details of a campaign and the number of recipients that have been uploaded for this campaign
 * @param req
 * @param res
 * @param next
 */
const getCampaignDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const result = await TelegramService.getCampaignDetails(+campaignId)
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

/**
 * Retrieves a message for this campaign
 * @param req
 * @param res
 * @param next
 */
const previewFirstMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    return res.json({
      preview: await TelegramService.getHydratedMessage(+campaignId),
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * Associate campaign with a credential
 * @param req
 * @param res
 * @param next
 */
const setCampaignCredential = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { telegramBotToken } = res.locals.credentials
    if (!telegramBotToken) {
      throw new Error('Credential does not exist')
    }

    const credentialName = botId(telegramBotToken)
    await TelegramService.setCampaignCredential(+campaignId, credentialName)
    return res.json({ message: 'OK' })
  } catch (err) {
    next(err)
  }
}

export const TelegramMiddleware = {
  getCredentialsFromBody,
  getCredentialsFromLabel,
  getCampaignCredential,
  isTelegramCampaignOwnedByUser,
  getCampaignDetails,
  previewFirstMessage,
  validateAndStoreCredentials,
  setCampaignCredential,
  sendValidationMessage,
}
