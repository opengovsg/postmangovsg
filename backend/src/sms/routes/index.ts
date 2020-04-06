import { Router } from 'express'
import smsRoutes from './sms.routes'
import { isSmsProject } from '@sms/middlewares'

const router = Router()

router.use('/', isSmsProject, smsRoutes)

export default router