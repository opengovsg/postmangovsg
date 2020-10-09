import path from 'path'
import winston from 'winston'
import { Request, Response } from 'express'
import { clientIp, userId } from '@core/utils/morgan'

const getModuleLabel = (callingModule: NodeModule): string => {
  // Remove the file extension from the filename and split with path separator.
  const parts = callingModule.filename.replace(/\.[^/.]+$/, '').split(path.sep)
  // Join the parts of the file path after build directory together
  return path.join(...parts.slice(parts.lastIndexOf('build') + 1))
}

class Logger {
  ip: string | undefined
  userId: string | undefined

  createLoggerWithLabel(module: NodeModule): winston.Logger {
    const label = getModuleLabel(module)
    const logger = winston.loggers.add(label, {
      level: 'debug',
      levels: winston.config.npm.levels,
      format: winston.format.combine(
        winston.format((info) => {
          return { ip: this.ip, userId: this.userId, ...info }
        })(),
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.label({ label }),
        winston.format.metadata(),
        winston.format.json()
      ),
      transports: [new winston.transports.Console()],
    })

    logger.stream = {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      write: (message: string, _encoding: any): void => {
        // use the 'info' log level so the output will be picked up by both transports
        logger.info(message)
      },
    }
    return logger
  }

  setRequestMetadata(req: Request, _res: Response): void {
    this.ip = clientIp(req, _res)
    this.userId = userId(req, _res)
  }
}

const { createLoggerWithLabel, setRequestMetadata } = new Logger()
export { createLoggerWithLabel, setRequestMetadata }
