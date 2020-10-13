import path from 'path'
import winston from 'winston'

const getModuleLabel = (callingModule: NodeModule): string => {
  // Remove the file extension from the filename and split with path separator.
  const parts = callingModule.filename.replace(/\.[^/.]+$/, '').split(path.sep)
  // Join the parts of the file path after build directory together
  return path.join(...parts.slice(parts.lastIndexOf('build') + 1))
}

interface LoggerInterface {
  logger: winston.Logger
}

class Logger implements LoggerInterface {
  logger: winston.Logger

  constructor() {
    this.logger = winston.createLogger({
      level: 'debug',
      levels: winston.config.npm.levels,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.metadata(),
        winston.format.json()
      ),
      transports: [new winston.transports.Console()],
    })

    this.logger.stream = {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      write: (message: string, _encoding: any): void => {
        // use the 'info' log level so the output will be picked up by both transports
        this.logger.info(message)
      },
    }
  }

  loggerWithLabel(module: NodeModule): any {
    const label = getModuleLabel(module)
    return {
      info: (logMeta: any): winston.Logger =>
        this.logger.info({ label, ...logMeta }),
      error: (logMeta: any): winston.Logger =>
        this.logger.error({ label, ...logMeta }),
      debug: (logMeta: any): winston.Logger =>
        this.logger.debug({ label, ...logMeta }),
      warn: (logMeta: any): winston.Logger =>
        this.logger.warn({ label, ...logMeta }),
    }
  }
}

const logger = new Logger()
export default logger
