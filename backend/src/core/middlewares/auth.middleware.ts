import { Request, Response } from 'express'
import { User } from '@core/models'


const getOtp = async (_req: Request, res: Response): Promise<Response> => {
  return res.sendStatus(200)
}

const verifyOtp = async (req: Request, res: Response): Promise<Response> => {
  if(req.session){
    const [user] = await User.findCreateFind({ where: { email: 'test@test.gov.sg' } })
    req.session.user = { id: user.id }
  }
  return res.sendStatus(200)
}

export { getOtp, verifyOtp }