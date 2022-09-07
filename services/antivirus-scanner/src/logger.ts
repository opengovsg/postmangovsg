import { config } from './config'
import winston from 'winston'

export const logger = winston.createLogger({
  level: 'debug',
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.metadata(),
    winston.format.json({
      space: config.environment === 'development' ? 2 : 0,
    })
  ),
  transports: [new winston.transports.Console()],
})