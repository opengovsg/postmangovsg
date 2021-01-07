import express from 'express'
import bodyParser from 'body-parser'
import sessionLoader from '@core/loaders/session.loader'
import { errors as celebrateErrorMiddleware } from 'celebrate'
import routes from '@core/routes'

const app: express.Application = express()
sessionLoader({ app })
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(routes)
app.use(celebrateErrorMiddleware())

export default app
