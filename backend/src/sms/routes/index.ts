import { Router } from 'express'
import smsRoutes from './sms.routes'
import { isSmsProject } from '../middlewares'

const router = Router()

router.use('/', isSmsProject, smsRoutes)

export default router