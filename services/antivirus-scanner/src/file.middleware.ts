import { NextFunction, Request, Response } from 'express'
import fileUpload from 'express-fileupload'

const fileUploadMiddleware = fileUpload({
  limits: {
    fileSize: Number(process.env.MAX_FILESIZE) || 10*1024*1024,
    files: 1,
  },
  abortOnLimit: true,
  limitHandler: function (_: Request, res: Response) {
    res.status(413).json({ message: 'Size of attachments exceeds limit' })
  },
  useTempFiles : true,
  tempFileDir : process.env.TMP_FILE_DIR || '/tmp/'
  
})
  
const fileProcessingMiddleWare = (req: Request, res: Response, next: NextFunction) => {
  console.log(req.files)
  if (!req.files || !req.files.file) {
    res.status(400).json({ message: 'No attachment found' })
    return
  } 
  if (Array.isArray(req.files.file)) {
    res.status(422).json({ message: 'Upload one attachment at a time' })
    return
  }
  req.body.file = req.files.file
  next()
  return 
}

export const FileMiddleware = {
  fileProcessingMiddleWare,
  fileUploadMiddleware,
}