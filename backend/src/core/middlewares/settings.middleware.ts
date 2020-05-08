import { Request, Response, NextFunction } from 'express'

import { User, UserCredential } from '@core/models'
import { ChannelType } from '@core/constants'

/*
 * Retrieves API key and stored credentials of the user
 */
const getUserSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.session?.user?.id
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
    if (!user) {
      throw new Error('User not found')
    }
    res.json({ 'has_api_key': !!user.apiKey, creds: user.creds })
  } catch (err) {
    next(err)
  }
}

// Checks if label already used for user
const checkUserCredentialLabel = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { label } = req.body
  try {
    const result = await UserCredential.findOne({
      where: {
        label,
      },
    })
    if (result) {
      return res.status(400).json({ message: 'User credential with the same label already exists.' })
    }
    next()
  } catch (e) {
    next(e)
  }
}

// Associate credential to user
const storeUserCredential = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { label } = req.body
  const userId = req.session?.user?.id
  const { credentialName, channelType } = res.locals
  try {
    if (!credentialName || !channelType) {
      throw new Error('Credential or credential type does not exist')
    }
    await UserCredential.create({
      label,
      type: channelType,
      credName: credentialName,
      userId,
    })
    return res.json({ message: 'OK' })
  } catch (e) {
    next(e)
  }
}

// Associate credential to user
const getChannelSpecificCredentials = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.session?.user?.id
  try {
    const creds = await UserCredential.findAll({
      where: {
        type: ChannelType.SMS,
        userId: userId,
      },
      attributes: ['label'],
    })
    return res.json(creds.map(c => c.label))
  } catch (e) {
    next(e)
  }
}

const deleteUserCredential = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { label } = req.body
  const userId = req.session?.user?.id
  try {
    const count = await UserCredential.destroy({
      where: {
        userId,
        label,
      },
    })
    if (count) {
      return res.json({ message: 'OK' })
    } else {
      res.status(400).json({ message: 'Credential not found' })
    }
  } catch (e) {
    next(e)
  }
}

const regenerateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const userId = req.session?.user?.id
  try {
    const user = await User.findByPk(userId)
    if (!user) {
      throw new Error('User not found')
    }
    const newApiKey = await user.regenerateAndSaveApiKey()
    return res.json({ 'api_key': newApiKey })
  } catch (e) {
    next(e)
  }
}

export const SettingsMiddleware = {
  getUserSettings,
  checkUserCredentialLabel,
  storeUserCredential,
  getChannelSpecificCredentials,
  deleteUserCredential,
  regenerateApiKey,
}