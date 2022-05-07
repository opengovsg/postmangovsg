import { cleanLogGlobalContext, logWithSeverity } from './logger.helpers'
import { LogEntry } from './logger.types'

export function awsCustomWrite(logEntry: LogEntry) {
  // eslint-disable-next-line no-console
  console.log(logEntry)
}

/**
 * LEVEL debug: Temporary logs for debugging, to be removed when feature is stable (should be used with a TODO {AUTHOR NAME} above it)
 * LEVEL info: Routine information, such as ongoing status or performance.
 * LEVEL metrics: Use to log metrics
 * LEVEL warn: Non-critical errors that should be filtered out in alarms (for example rateLimiter)
 * LEVEL error: Error events are likely to cause problems.
 */
export const logger = {
  debug: (message: any) => logWithSeverity('DEBUG', message),
  info: (message: any) => logWithSeverity('INFO', message),
  warn: (message: any) => logWithSeverity('WARNING', message),
  error: (message: any) => logWithSeverity('ERROR', message),
}

export { cleanLogGlobalContext }
