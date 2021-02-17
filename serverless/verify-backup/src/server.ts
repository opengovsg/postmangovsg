import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import { spawn } from 'child_process'
import dotenv from 'dotenv'
dotenv.config()

const app = express()
const PORT = process.env.PORT || 8080

app.use(bodyParser.json())

app.post('/', async (req: Request, res: Response) => {
  // set request timeout to prevent server from aborting
  // before verify-backup process is complete
  req.setTimeout(20 * 60 * 1000) // 20 mins

  // run verify-backup script
  const verifyBackup = spawn('sh', ['scripts/verify-backup.sh'])
  verifyBackup.stdout.on('data', (data) => {
    console.log(data.toString().trim())
  })
  verifyBackup.stderr.on('data', (data) => {
    console.log(data.toString().trim())
  })
  verifyBackup.on('error', (error) => {
    console.log(error.message.toString().trim())
  })
  verifyBackup.on('close', (data) => {
    console.log(`script exited with code: ${data}`)
    // Send the response after script has completed
    res.sendStatus(200)
  })
})

app.listen(PORT, () =>
  console.log(`PubSub server is listening on port ${PORT}`)
)
