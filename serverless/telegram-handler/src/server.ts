// Development server for Telegram handler
import express from 'express'

import config from './config'
import { handler } from '.'

const { port: PORT, botToken: TOKEN } = config.get('devServer')

if (!TOKEN) {
  console.error('Error: Bot token is required.')
  process.exit(1)
}

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
