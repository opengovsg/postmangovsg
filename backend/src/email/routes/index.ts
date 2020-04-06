import { Router } from 'express'
import emailRoutes from './email.routes'
import { isEmailProject } from '@email/middlewares'

const router = Router()

router.use('/', isEmailProject, emailRoutes)

export default router