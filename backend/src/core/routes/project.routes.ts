import { Request, Response, Router } from 'express'

const router = Router()

// TODO: joi validators here

// route handlers here
const listProjects = async (_req: Request, res: Response) => {
  res.status(200).json({ message: 'ok' })
}

// actual routes here
router.get('/', listProjects)

export const projectRoutes = router