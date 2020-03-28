import { Request, Response, Router } from 'express'
import { ChannelType } from '@core/constants'

const router = Router()
console.log(ChannelType)

// validators

// route handlers here
const listProjects = async (_req: Request, res: Response) => {
  res.status(200).json({ message: 'ok' })
}

// actual routes here
router.get('/', listProjects)

router.post('/')

export const projectRoutes = router