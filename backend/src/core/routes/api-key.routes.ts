import { Router } from 'express'
import { ApiKeyMiddleware } from '@core/middlewares/api-key.middleware'

const router = Router()

router.delete('/:apiKeyId', ApiKeyMiddleware.deleteApiKey)
export default router
