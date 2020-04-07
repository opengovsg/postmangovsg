import { Router } from 'express'
import emailRoutes from './email.routes'
import { isEmailCampaignOwnedByUser } from '@email/middlewares'

const router = Router({ mergeParams: true })

router.use('/', isEmailCampaignOwnedByUser, emailRoutes)

export default router