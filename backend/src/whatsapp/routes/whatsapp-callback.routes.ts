import { Router } from 'express'
import { WhatsappCallbackMiddleware } from '@whatsapp/middlewares'

const router = Router()

router.post('/', WhatsappCallbackMiddleware.parseEvent)
export default router
