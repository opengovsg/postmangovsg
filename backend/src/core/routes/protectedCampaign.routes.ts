import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { ProtectedMiddleware } from '@core/middlewares'

const router = Router()

const protectVerifyValidator = {
  [Segments.BODY]: Joi.object({
    hashedPassword: Joi.string().required(),
  }),
}

/**
 * @swagger
 * path:
 *   /protect/{uuid}:
 *     post:
 *       description: Verify hashed password and return encrypted payload
 *       tags:
 *         - Email
 *       parameters:
 *         - name: campaignId
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *         - name: uuid
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               required:
 *                 - hashedPassword
 *               properties:
 *                 hashedPassword:
 *                   type: string
 *       responses:
 *         200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                 payload:
 *                  type: string
 *         "400" :
 *           description: Bad Request
 *         "401":
 *           description: Unauthorized
 *         "500":
 *           description: Internal Server Error
 */
router.post(
  '/:uuid',
  celebrate(protectVerifyValidator),
  ProtectedMiddleware.verifyPasswordHash
)

export default router
