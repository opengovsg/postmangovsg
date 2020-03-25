import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import v1Router from '../routes'
import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Postman",
      version: "0.1.0",
      description: "Postman server",
      license: {
        name: "MIT",
        url: "https://choosealicense.com/licenses/mit/"
      }
    },
    basePath: "/api/v1",
  },
  apis: ["build/**/*.js"]
};

const swaggerSpec = swaggerJSDoc(options)

const expressApp = ({ app }: { app: express.Application }): void => {
  app.use(bodyParser.json())
  app.get('/', async (_req: Request, res: Response) => {
    res.sendStatus(200)
  })
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true
  }))
  app.use('/api/v1', v1Router)
}

export default expressApp