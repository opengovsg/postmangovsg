// Development server for Telegram handler
import express from 'express'
import config from './config'

import { handler } from '.'

const { path: PATH, port: PORT } = config.get('devServer')

const app = express()
app.use(express.json())

app.post(`${PATH}:botId`, async (req, res) => {
  const event = {
    body: JSON.stringify(req.body), // simulate Lambda's stringified body
    pathParameters: req.params,
  }
  await handler(event) // execute handler

  res.sendStatus(200)
})

// ngrok http 8000
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT} at ${PATH}{botId}`)
})
