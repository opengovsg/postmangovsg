import winston from 'winston'

interface LoggerInterface {
  logger: winston.Logger;
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
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
      ],
    })

    this.logger.stream = {
      // @ts-ignore
      write: (message: string, _encoding: any) => {
        // use the 'info' log level so the output will be picked up by both transports
        this.logger.info(message)
      }
    }
  }
}

const logger = new Logger().logger
export default logger