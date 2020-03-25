import { Request, Response, Router } from 'express'
import { ChannelType } from '@core/constants'
import { celebrate, Joi, Segments } from 'celebrate'

const router = Router()

// validators
const createProjectValidator = {
  [Segments.BODY]: Joi.object({
    type: Joi.string().valid(...Object.values(ChannelType)).required(),
    name: Joi.string().max(255).trim().required(),
  }),
}

// route handlers here

// Create project
const createProject = async (_req: Request, res: Response) => {
  res.json({ 
    // project details
  })
}

// List projects
const listProjects = async (_req: Request, res: Response) => {
  res.status(200).json({ message: 'ok' })
}

// actual routes here


router.get('/', listProjects)

/**
 * @swagger
 * path:
 *  /v1/projects:
 *    post:
 *      summary: Create a new project
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

export const projectRoutes = router