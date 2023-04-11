import { Router } from 'express'
import { WhatsappCallbackMiddleware } from '../middlewares'

const router = Router()

router.post('/', WhatsappCallbackMiddleware.parseEvent)
export default router
