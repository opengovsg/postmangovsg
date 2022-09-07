import express, { Application } from 'express';
import { logger } from './logger'
import { FileMiddleware } from './file.middleware'
import { ClamScanMiddleware } from './clamscan.middleware'

const port = Number(process.env.PORT) || 8080
const app: Application = express()

app.use(express.json())

app.post('/scan', 
  // TODO: introduce authentication layer
  FileMiddleware.fileUploadMiddleware, 
  FileMiddleware.fileProcessingMiddleWare,
  ClamScanMiddleware.antiVirusScanMiddleWare,
)

app.listen(port, () => logger.info(`Listening on port ${port}!`))