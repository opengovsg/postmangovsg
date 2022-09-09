import { logger } from './logger'
import { Request, Response } from 'express'
import { exec } from 'child_process'
import util from 'util'
import fs from 'fs'

const execPromise = util.promisify(exec);

const scanFromFilePath = async (filePath: string) => {
  logger.info(`scanning file ${filePath}`)
  
  try {
    await execPromise(`clamdscan ${filePath}`);
    return { isMalicious: false }

  } catch (error: any) {
    if (error.code === 1) {
      console.log('file has virus')
      
      // delete file
      fs.unlink(filePath, function(err) {
        if(err) console.log(err)
        else console.log('file deleted')
      })
      return { isMalicious: true }
    } 

    logger.error(`Unable to scan file, error: ${error}`)
    throw new Error(`Unable to scan file`)
  }
}

const antiVirusScanMiddleWare = async (req: Request, res: Response) => {
  const { file } = req.body
  try {
    const scanResult = await scanFromFilePath(file.tempFilePath)
    res.status(200).json(scanResult)
  
  } catch (error: any) {
    res.status(400).json({ message: 'Unable to scan file'})
  } 
}

export const ClamScanMiddleware = {
  antiVirusScanMiddleWare,
}