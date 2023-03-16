import { Router } from 'express'
import { ApiKeyMiddleware } from '@core/middlewares/api-key.middleware'

export const InitApiKeyRoutes = (
  apiKeyMiddleware: ApiKeyMiddleware
): Router => {
  const router = Router()

  router.delete('/:apiKeyId', apiKeyMiddleware.deleteApiKey)
  return router
}
