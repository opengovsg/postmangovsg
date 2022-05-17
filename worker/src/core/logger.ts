import winston from 'winston'

const getModuleLabel = (callingModule: NodeModule): string => {
  const moduleName = callingModule.filename
  // Get the subpath after the build dir without the file extension
  return moduleName.substring(
    moduleName.lastIndexOf('build') + 6,
    moduleName.lastIndexOf('.')
  )
}

const logger = winston.createLogger({
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

export const addTransport = (transport: winston.transport) => {
  logger.add(transport)
}

export const loggerWithLabel = (module: NodeModule): any => {
  const label = getModuleLabel(module)
  return {
    info: (logMeta: any): winston.Logger => logger.info({ label, ...logMeta }),
    error: (logMeta: any): winston.Logger =>
      logger.error({ label, ...logMeta }),
    debug: (logMeta: any): winston.Logger =>
      logger.debug({ label, ...logMeta }),
    warn: (logMeta: any): winston.Logger => logger.warn({ label, ...logMeta }),
  }
}
