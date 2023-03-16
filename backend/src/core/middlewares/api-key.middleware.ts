import { loggerWithLabel } from '@core/logger'
import { Handler, NextFunction, Request, Response } from 'express'
import { ApiKeyService, AuthService } from '@core/services'

export interface ApiKeyMiddleware {
  deleteApiKey: Handler
}
export const InitApiKeyMiddleware = (authService: AuthService) => {
  const logger = loggerWithLabel(module)

  const deleteApiKey = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      // enforce authentication by cookie
      const authenticated = authService.checkCookie(req)
      if (!authenticated) {
        return res.sendStatus(403).json({
          message: `Invalid cookie`,
        })
      }

      const { apiKeyId } = req.params
      const userId = req.session?.user?.id

      const count = await ApiKeyService.deleteApiKey(
        userId.toString(),
        +apiKeyId
      )
      if (count <= 0) {
        return res.sendStatus(404).json({
          message: `Could not find API key to delete`,
        })
      }
      logger.info({
        message: 'Successfully deleted api key',
        action: 'deleteApiKey',
      })
      return res.sendStatus(200)
    } catch (err) {
      return next(err)
    }
  }

  return {
    deleteApiKey,
  }
}
