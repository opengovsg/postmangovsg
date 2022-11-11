import { Application, Request, Response, NextFunction } from 'express'
import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

import { loggerWithLabel } from '@shared/core/logger'

const logger = loggerWithLabel(module)
const options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Postman',
      version: 'v1',
      description: 'Postman server',
      license: {
        name: 'MIT',
        url: 'https://choosealicense.com/licenses/mit/',
      },
    },
    servers: [{ url: '/v1' }],
  },
  apis: ['build/**/*.js'],
}

const swaggerSpec = swaggerJSDoc(options)
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

const swaggerLoader = ({ app }: { app: Application }): void => {
  app.use(
    '/docs',
    removeCspHeader,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  )
  logger.info({
    message: 'Swagger docs generated.',
  }) /*, JSON.stringify(swaggerSpec, null, 2) */
}

export default swaggerLoader
