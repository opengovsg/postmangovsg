export interface Scope {
  fileName?: string
  functionName?: string
  methodName?: string
  lineNumber?: number
  className?: string
}

/**
 * Matches from firebase-functions v3. For now, we don't use GCP, so we can change this enum as desired.
 * See [LogSeverity](https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity).
 */
export type LogSeverity =
  | 'DEBUG'
  | 'INFO'
  | 'NOTICE'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL'
  | 'ALERT'
  | 'EMERGENCY'

/**
 * Copied from firebase-functions v3. Again, we don't use GCP, so this compatibility is not important.
 * See [structured Cloud Logging](https://cloud.google.com/logging/docs/structured-logging).
 * All keys aside from `severity` and `message` are included in the `jsonPayload` of the logged entry.
 */
export interface LogEntry {
  severity: LogSeverity
  message?: string
  [key: string]: any
}
