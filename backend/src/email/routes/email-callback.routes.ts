import { Request, Response } from 'express'
import { Router } from 'express'
const router = Router()

/**
 * @swagger
 * path:
 *   /callback/email:
 *    post:
 *      summary: Update status of email message
 *      tags:
 *        - Callback
 *      responses:
 *        200:
 *          description: OK
 *        400:
 *          description: Bad Request
 */
router.post('/', (_req: Request, res: Response) => res.sendStatus(200))

export default router
