import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'

import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

const swaggerUiOptions = {
  explorer: false,
  customCss: '.swagger-ui .topbar { display: none; }',
  url: '/v1/swagger.json',
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
  app.get('/v1/swagger.json', (_req, res) => res.json(swaggerDocument))
  app.use(
    '/docs',
    removeCspHeader,
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, swaggerUiOptions)
  )
  app.use(
    '/openapi.yaml',
    cors({
      origin: '*',
      methods: ['GET'],
    }),
    express.static(path.resolve(__dirname, '../../../openapi.yaml'))
  )
  logger.info({
    message: 'Swagger docs generated.',
  })
}

export default swaggerLoader
