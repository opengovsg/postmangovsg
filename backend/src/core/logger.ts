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
    winston.format.json({
      space: process.env.NODE_ENV === 'development' ? 2 : 0,
    }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
})

logger.stream = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  write: (message: string, _encoding: any): void => {
    // use the 'info' log level so the output will be picked up by both transports
    logger.info(message)
  },
}

const getStream = () => {
  return logger.stream
}

const addTransport = (transport: any) => {
  logger.add(transport)
}

const truncate = (message: string, length: number, suffix = true): string => {
  if (!message) {
    return ''
  }
  return message.length > length
    ? `${message.substring(0, length)}${suffix ? '...<TRUNCATED>' : ''}`
    : message
}
const loggerWithLabel = (module: NodeModule): any => {
  const label = getModuleLabel(module)
  return {
    log: (logMeta: any): winston.Logger => logger.log({ label, ...logMeta }),
    info: (logMeta: any): winston.Logger => logger.info({ label, ...logMeta }),
    error: (logMeta: any): winston.Logger => {
      if (logMeta.error && logMeta.error instanceof Error) {
        logMeta.error = truncate(logMeta.error.stack, 400)
      }
      return logger.error({ label, ...logMeta })
    },

    debug: (logMeta: any): winston.Logger =>
      logger.debug({ label, ...logMeta }),
    warn: (logMeta: any): winston.Logger => logger.warn({ label, ...logMeta }),
  }
}

export { getStream, addTransport, loggerWithLabel }
