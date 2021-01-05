import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'

const app = express()
const PORT = process.env.PORT || 8080

app.use(bodyParser.json())

app.post('/', (req: Request, res: Response) => {
  console.log('Incoming pubsub message', JSON.stringify(req.body))
  res.sendStatus(200)
})

app.listen(PORT, () =>
  console.log(`PubSub server is listening on port ${PORT}`)
)
