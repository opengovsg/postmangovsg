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
      .min(1),
    offset: Joi
      .number()
      .positive()
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
 *  /projects:
 *    get:
 *      tags:
 *        - Projects
 *      summary: List all projects for user
 *      parameters:
 *        - in: query
 *          name: limit
 *          description: max number of projects returned
 *          required: true
 *          schema:
 *            type: integer
 *            minimum: 1
*        - in: query
 *          name: offset
 *          description: offset to begin returning projects from
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
 *  /projects:
 *    post:
 *      summary: Create a new project
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