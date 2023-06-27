import { GovsgTemplateMiddleware } from '@govsg/middlewares'
import { Router } from 'express'

const router = Router()

router.get('/', GovsgTemplateMiddleware.getAvailableTemplates)

export default router
