import { Router } from 'express'
import { ChannelType } from '@core/constants'
import { celebrate, Joi, Segments } from 'celebrate'
import { createProject, listProjects } from '@core/middlewares'
const router = Router()

// validators
const listProjectsValidator = {
  [Segments.QUERY]: Joi.object({
    limit: Joi
      .number()
      .integer()
      .min(1)
      .optional(),
    offset: Joi
      .number()
      .integer()
      .min(0)
      .optional(),
  }),
}

const createProjectValidator = {
  [Segments.BODY]: Joi.object({
    type: Joi
      .string()
      .valid(...Object.values(ChannelType))
      .required(),
    name: Joi.
      string()
      .max(255)
      .trim()
      .required(),
  }),
}

// actual routes here

/**
 * @swagger
 * path:
 *  /campaigns:
 *    get:
 *      tags:
 *        - Projects
 *      summary: List all campaigns for user
 *      parameters:
 *        - in: query
 *          name: limit
 *          description: max number of campaigns returned
 *          required: false
 *          schema:
 *            type: integer
 *            minimum: 1
*        - in: query
 *          name: offset
 *          description: offset to begin returning campaigns from
 *          required: false
 *          schema:
 *            type: integer
 *            minimum: 0            
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/ProjectMeta'
 */
router.get('/', celebrate(listProjectsValidator), listProjects)

/**
 * @swagger
 * path:
 *  /campaigns:
 *    post:
 *      summary: Create a new campaign
 *      tags:
 *        - Projects
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                name:
 *                  type: string
 *                type: 
 *                   $ref: '#/components/schemas/ChannelType'
 *              required:
 *              - name
 *              - type
 *                  
 *      responses:
 *        "201":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.post('/', celebrate(createProjectValidator), createProject)

export default router