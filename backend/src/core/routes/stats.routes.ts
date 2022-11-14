import { Router } from 'express'
import { StatsMiddleware } from '@core/middlewares'

const router = Router()

/**
 * paths:
 *  /stats:
 *    get:
 *      summary: Get count of total messages sent
 *      tags:
 *        - Stats
 *
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  sent:
 *                    type: number
 *
 */
router.get('/', StatsMiddleware.getGlobalStats)

export default router
