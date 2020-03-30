import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { verifyProjectOwner } from '../middlewares'

const projectIdValidator = {
  [Segments.PARAMS]: Joi.object({
    projectId: Joi
      .number()
      .integer()
      .positive()
      .required(),
  }),
}

import projectRoutes from './project.routes'
// Import channel-specific routes
import smsRoutes from '@sms/routes'
import emailRoutes from '@email/routes'

const router = Router()

router.use('/projects', projectRoutes)
router.use('/project/:projectId/sms', celebrate(projectIdValidator), verifyProjectOwner, smsRoutes)
router.use('/project/:projectId/email', celebrate(projectIdValidator), verifyProjectOwner, emailRoutes)

export default router