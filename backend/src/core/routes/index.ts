import { Router } from 'express'
import { projectRoutes } from './project.routes'

const router = Router()

router.use('/projects', projectRoutes)
router.use('/projects/:id', projectRoutes)

export default router