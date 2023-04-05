import { Router } from 'express'
import { ApiKeyMiddleware } from '@core/middlewares/api-key.middleware'
import { celebrate, Joi, Segments } from 'celebrate'

export const InitApiKeyRoute = (apiKeyMiddleware: ApiKeyMiddleware): Router => {
  const router = Router()
  router.post(
    '/',
    celebrate({
      [Segments.BODY]: Joi.object({
        label: Joi.string().max(255).required(),
      }),
    }),
    apiKeyMiddleware.generateApiKey
  )
  router.get('/', apiKeyMiddleware.listApiKeys)

  router.delete('/:apiKeyId', apiKeyMiddleware.deleteApiKey)
  return router
}
