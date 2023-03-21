import { Router } from 'express'
import { ApiKeyMiddleware } from '@core/middlewares/api-key.middleware'

const router = Router()

router.get('/', ApiKeyMiddleware.listApiKeys)

router.delete('/:apiKeyId', ApiKeyMiddleware.deleteApiKey)
export default router
