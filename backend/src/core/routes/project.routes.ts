import { Request, Response, Router } from 'express'
import { ChannelType } from '@core/constants'
import { celebrate, Joi, Segments } from 'celebrate'

const router = Router()

// validators
const listProjectsValidator = {
  [Segments.PARAMS]: Joi.object(),
  [Segments.QUERY]: Joi.object({
    limit: Joi
      .number()
      .min(0),
    offset: Joi
      .number()
      .positive()
      .min(1)
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

// route handlers here

// Create project
async function createProject(_req: Request, res: Response): Promise<void> {
  res.json({
    // project details
  })
}

// List projects
async function listProjects(_req: Request, res: Response): Promise<void> {
  res.json({ message: 'ok' })
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
 *          name: offset
 *          description: offset index for projects
 *          required: false
 *          schema:
 *            type: integer
 *            minimum: 0
 *        - in: query
 *          name: limit
 *          description: max number of projects returned
 *          required: true
 *          schema:
 *            type: integer
 *            minimum: 1
 *                  
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
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */
router.post('/', celebrate(createProjectValidator), createProject)

export default router