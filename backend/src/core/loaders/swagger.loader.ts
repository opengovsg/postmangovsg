import { Application } from 'express'
import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

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
    servers: [
      { url: '/api/v1' },
    ],
  },
  apis: ['build/**/*.js'],
}

const swaggerSpec = swaggerJSDoc(options)

const swaggerLoader = ({ app }: { app: Application }): void => {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
  }))
  console.log('Swagger docs generated' /*, JSON.stringify(swaggerSpec, null, 2) */)
}

export default swaggerLoader