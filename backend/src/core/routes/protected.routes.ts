import { ProtectedMiddleware } from '@core/middlewares'
import { celebrate, Joi, Segments } from 'celebrate'
import { Router } from 'express'

const router = Router()

const protectVerifyValidator = {
  [Segments.BODY]: Joi.object({
    password_hash: Joi.string().required(),
  }),
}

/**
 * @swagger
 * paths:
 *   /protect/{id}:
 *     post:
 *       description: Verify password hash and return encrypted payload
 *       tags:
 *         - Email
 *       parameters:
 *         - name: id
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               required:
 *                 - password_hash
 *               properties:
 *                 password_hash:
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
 *         "403":
 *           description: Wrong password or message id
 *         "500":
 *           description: Internal Server Error
 */
router.post(
  '/:id',
  celebrate(protectVerifyValidator),
  ProtectedMiddleware.verifyPasswordHash
)

export default router
