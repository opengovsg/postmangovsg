import { Router } from 'express'
import smsRoutes from './sms.routes'
import { isSmsCampaign } from '@sms/middlewares'

const router = Router()

router.use('/', isSmsCampaign, smsRoutes)

export default router