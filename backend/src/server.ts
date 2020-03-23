import express from 'express'

const port = Number(process.env.PORT) || 4000
const app: express.Application = express()
const start = async (): Promise<void> => {
  app.listen(port, () => console.log(`Listening on port ${port}!`))
}

start()