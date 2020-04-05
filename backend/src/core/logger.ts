import winston from 'winston'

interface LoggerInterface {
  logger: winston.Logger;
}

class Logger implements LoggerInterface {
  logger: winston.Logger

  constructor () {
    this.logger = winston.createLogger({
      level: 'debug',
      levels: winston.config.npm.levels,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      transports: [new winston.transports.Console()],
    })
  }
}

const logger = new Logger().logger
export default logger