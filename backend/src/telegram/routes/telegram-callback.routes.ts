import { Request, Response } from 'express'
import { Router } from 'express'
const router = Router()

/**
 * @swagger
 * path:
 *  /callback/telegram/{botId}:
 *    post:
 *      summary: Subscribe to telegram bot
 *      tags:
 *        - Callback
 *      parameters:
 *        - name: botId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *      responses:
 *        200:
 *          description: OK
 *        400:
 *          description: Bad Request
 */
router.post('/:botId', (_req: Request, res: Response) => res.sendStatus(200))

export default router
