import { Request, Response, NextFunction, Handler } from 'express'
import { ChannelType } from '@core/constants'
import { CredentialService } from '@core/services'
import { loggerWithLabel } from '@core/logger'

export interface SettingsMiddleware {
  getUserSettings: Handler
  checkUserCredentialLabel: Handler
  storeUserCredential: Handler
  checkAndStoreLabelIfExists: Handler
  getChannelSpecificCredentials: Handler
  deleteUserCredential: Handler
  regenerateApiKey: Handler
  updateDemoDisplayed: Handler
  updateAnnouncementVersion: Handler
}

export const InitSettingsMiddleware = (
  credentialService: CredentialService
): SettingsMiddleware => {
  const logger = loggerWithLabel(module)

  /*
   * Retrieves API key and stored credentials of the user
   */
  const getUserSettings = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    try {
      const userId = req.session?.user?.id
      const userSettings = await credentialService.getUserSettings(userId)
      if (!userSettings) {
        throw new Error('User not found')
      }
      return res.json({
        has_api_key: userSettings.hasApiKey,
        creds: userSettings.creds,
        demo: {
          num_demos_sms: userSettings.demo?.numDemosSms,
          num_demos_telegram: userSettings.demo?.numDemosTelegram,
          is_displayed: userSettings.demo?.isDisplayed,
        },
        announcement_version: userSettings.userFeature?.announcementVersion,
      })
    } catch (err) {
      next(err)
    }
  }

  /**
   * Checks if label already used for that user
   * @param req
   * @param res
   * @param next
   */
  const checkUserCredentialLabel = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id
      const { label } = req.body
      const result = await credentialService.getUserCredential(userId, label)
      const errorMessage = 'User credential with the same label already exists.'
      if (result) {
        logger.error({
          message: errorMessage,
          label,
          action: 'checkUserCredentialLabel',
        })
        return res.status(400).json({ message: errorMessage })
      }
      next()
    } catch (e) {
      next(e)
    }
  }

  /**
   * Associate credential to user
   * @param req
   * @param res
   * @param next
   */
  const storeUserCredential = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const { label } = req.body
    const userId = req.session?.user?.id
    const { credentialName, channelType } = res.locals
    const logMeta = {
      action: 'storeUserCredential',
      credentialName,
      channelType,
    }
    try {
      if (!credentialName || !channelType) {
        const errorMessage = 'Credential or credential type does not exist'
        throw new Error(errorMessage)
      }
      await credentialService.createUserCredential(
        label,
        channelType,
        credentialName,
        +userId
      )
      logger.info({ message: 'Stored user credential', ...logMeta })
      return res.json({ message: 'OK' })
    } catch (e) {
      next(e)
    }
  }

  const checkAndStoreLabelIfExists = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const { label } = req.body
    if (!label) {
      return next()
    }
    const userId = req.session?.user?.id
    const { credentialName, channelType } = res.locals

    try {
      const result = await credentialService.getUserCredential(userId, label)
      if (result) {
        return res.status(400).json({
          message: 'User credential with the same label already exists.',
        })
      }
      if (!credentialName || !channelType) {
        throw new Error('Credential or credential type does not exist')
      }
      await credentialService.createUserCredential(
        label,
        channelType,
        credentialName,
        +userId
      )
      next()
    } catch (e) {
      next(e)
    }
  }

  /**
   * Get only labels for SMS and Telegram credentials for that user
   * @param req
   * @param res
   * @param next
   */
  const getChannelSpecificCredentials = async (
    req: Request,
    res: Response
  ): Promise<Response | void> => {
    try {
      const { channelType } = req.params
      const userId = req.session?.user?.id

      let result
      switch (channelType) {
        case ChannelType.SMS:
          result = await credentialService.getSmsUserCredentialLabels(+userId)
          break
        case ChannelType.Telegram:
          result = await credentialService.getTelegramUserCredentialLabels(
            +userId
          )
          break
        default:
          throw new Error('Unsupported channel type')
      }
      return res.json(result)
    } catch (e) {
      const errAsError = e as Error
      logger.error({
        message: `${errAsError.stack}`,
        action: 'getChannelSpecificCredentials',
      })
      return res.status(400).json({ message: `${errAsError.message}` })
    }
  }

  /**
   * Delete a credential label for that user
   * @param req
   * @param res
   * @param next
   */
  const deleteUserCredential = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const { label } = req.body
      const userId = req.session?.user?.id
      const count = await credentialService.deleteUserCredential(+userId, label)
      const logMeta = { label, action: 'deleteUserCredential' }
      if (count) {
        logger.info({ message: 'User credential deleted', ...logMeta })
        return res.json({ message: 'OK' })
      } else {
        logger.error({ message: 'Credential not found', ...logMeta })
        res.status(400).json({ message: 'Credential not found' })
      }
    } catch (e) {
      next(e)
    }
  }

  /**
   * Generate and associate an api key with that user
   * @param req
   * @param res
   * @param next
   */
  const regenerateApiKey = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id
      const apiKey = await credentialService.regenerateApiKey(+userId)
      return res.json({ api_key: apiKey })
    } catch (e) {
      next(e)
    }
  }

  /**
   * Update whether demos should be displayed for user
   * @param req
   * @param res
   * @param next
   */
  const updateDemoDisplayed = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id
      const { is_displayed: isDisplayed } = req.body
      await credentialService.updateDemoDisplayed(+userId, isDisplayed)
      return res.sendStatus(200)
    } catch (e) {
      next(e)
    }
  }

  /**
   * Update the announcement version for user
   * @param req
   * @param res
   * @param next
   */
  const updateAnnouncementVersion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id
      const { announcement_version: announcementVersion } = req.body
      await credentialService.updateAnnouncementVersion(
        +userId,
        announcementVersion
      )
      return res.sendStatus(200)
    } catch (e) {
      next(e)
    }
  }

  return {
    getUserSettings,
    checkUserCredentialLabel,
    storeUserCredential,
    checkAndStoreLabelIfExists,
    getChannelSpecificCredentials,
    deleteUserCredential,
    regenerateApiKey,
    updateDemoDisplayed,
    updateAnnouncementVersion,
  }
}
