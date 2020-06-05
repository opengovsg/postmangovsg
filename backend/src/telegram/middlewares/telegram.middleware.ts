import { Request, Response, NextFunction } from 'express'
import { ChannelType } from '@core/constants'
import { CredentialService } from '@core/services'
import { TelegramService } from '@telegram/services'

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

  res.locals.credentials = {
    telegramBotToken,
  }
  return next()
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
  _: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { credentials } = res.locals
  const { telegramBotToken } = credentials

  try {
    await TelegramService.validateAndConfigureBot(telegramBotToken)
  } catch (err) {
    return res.status(400).json({ message: `${err}` })
  }

  try {
    // Credential name will be raw botId. The botId will not be hashed as we
    // want to preserve the mapping between botId and token even in the event
    // of a change in salt for future token revocations/updates for the given
    // botId.
    const [credentialName] = telegramBotToken.split(':')

    await CredentialService.storeCredential(credentialName, telegramBotToken)

    // Pass on to next middleware/handler
    res.locals.credentialName = credentialName
    res.locals.channelType = ChannelType.Telegram
    next()
  } catch (err) {
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
    return campaign ? next() : res.sendStatus(400)
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
    return res.json({
      campaign: (await result).campaign,
      num_recipients: result.numRecipients,
    })
  } catch (err) {
    return next(err)
  }
}

export const TelegramMiddleware = {
  getCredentialsFromBody,
  isTelegramCampaignOwnedByUser,
  getCampaignDetails,
  validateAndStoreCredentials,
}
