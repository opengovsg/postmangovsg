import { Router } from 'express'
import smsRoutes from './sms.routes'
import { isSmsCampaignOwnedByUser } from '@sms/middlewares'

const router = Router({ mergeParams: true })

router.use('/', isSmsCampaignOwnedByUser, smsRoutes)

export default router
