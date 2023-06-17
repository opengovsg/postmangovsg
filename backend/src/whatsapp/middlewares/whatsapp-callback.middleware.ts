import { Request, Response } from 'express'

const testHandler = (req: Request, res: Response): Response => {
  console.log('testHandler invoked')
  console.log(req.body)
  return res.sendStatus(200)
}

export const WhatsappCallbackMiddleware = {
  testHandler,
}
