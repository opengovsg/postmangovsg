import { Router } from 'express'
import { ListMiddleware } from '@core/middlewares/list.middleware'

const router = Router()

/**
 * @swagger
 * paths:
 *   /lists:
 *     get:
 *       description: Get all lists
 *       tags:
 *         - List
 *       responses:
 *         200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                 lists:
 *                  type: array
 *         400:
 *           description: Bad Request (invalid request, already unsubscribed)
 *         500:
 *           description: Internal Server Error
 */
router.get('/', ListMiddleware.getAllLists)

export default router
