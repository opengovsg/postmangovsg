import { Application, Request, Response, NextFunction } from 'express'
import path from 'path'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'

import { loggerWithLabel } from '@shared/core/logger'

const logger = loggerWithLabel(module)

const swaggerUiOptions = {
  explorer: false,
  customCss: '.swagger-ui .topbar { display: none; }',
}

const removeCspHeader = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.removeHeader('Content-Security-Policy')
  next()
}

const swaggerDocument = YAML.load(
  path.resolve(__dirname, '../../../openapi.yaml')
)

const swaggerLoader = ({ app }: { app: Application }): void => {
  app.use(
    '/docs',
    removeCspHeader,
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, swaggerUiOptions)
  )
  logger.info({
    message: 'Swagger docs generated.',
  })
}

export default swaggerLoader
