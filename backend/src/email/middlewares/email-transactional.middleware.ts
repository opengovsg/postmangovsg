import type { Request, Response, NextFunction } from 'express'
import { EmailTransactionalService } from '@email/services'
import { loggerWithLabel } from '@core/logger'
import { TemplateError } from 'postman-templating'
import { AuthService } from '@core/services'

const logger = loggerWithLabel(module)

async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ACTION = 'sendMessage'

  try {
    const { subject, body, from, recipient, reply_to: replyTo } = req.body

    logger.info({ message: 'Sending email', action: ACTION })
    await EmailTransactionalService.sendMessage({
      subject,
      body,
      from,
      recipient,
      replyTo:
        replyTo ?? (await AuthService.findUser(req.session?.user?.id))?.email,
    })
    res.sendStatus(202)
  } catch (err) {
    logger.error({
      message: 'Failed to send email',
      action: ACTION,
      error: err,
    })

    if (err instanceof TemplateError) {
      res.status(400).json({ message: err.message })
      return
    }
    next(err)
  }
}

export const EmailTransactionalMiddleware = {
  sendMessage,
}
