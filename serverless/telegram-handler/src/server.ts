// Development server for Telegram handler
import express from 'express'

import config from './config'
import { handler } from '.'

const PORT = config.get('devServerPort')

const app = express()
app.use(express.json())

app.post('/:botId', async (req, res) => {
  const event = {
    body: JSON.stringify(req.body), // simulate Lambda's stringified body
    pathParameters: req.params,
  }
  const result = await handler(event) // execute handler

  res.send(result)
})

// ngrok http PORT
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
