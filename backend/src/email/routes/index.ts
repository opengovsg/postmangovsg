import { Router } from 'express'
import emailRoutes from './email.routes'
import { isEmailCampaign } from '@email/middlewares'

const router = Router()

router.use('/', isEmailCampaign, emailRoutes)

export default router