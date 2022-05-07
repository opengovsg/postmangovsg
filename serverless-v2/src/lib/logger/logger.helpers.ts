import { isNil, omitBy } from 'lodash'
import { get } from 'stack-trace'

import { config } from '~/config'

import { LogEntry, LogSeverity, Scope } from './logger.types'

/** To allow easy tracing across Lambda logs, e.g. filter logs from 1 execution / from 1 user */
let logGlobalContext: { [key: string]: any } = {}

export function getLogGlobalContext() {
  return { ...logGlobalContext }
}

export function addLogGlobalContext(key: string, entry: any) {
  logGlobalContext[key] = entry
}

/** Removes all context that were included in the logs. */
export function cleanLogGlobalContext() {
  logGlobalContext = {}
}

const IGNORED_STACK_TRACE_FUNCTIONS = new Set([
  'next',
  'Promise',
  '__awaiter',
  'fulfilled',
  'step',
  'processTicksAndRejections',
  'Module._compile',
  'm._compile',
])

export function logWithSeverity(severity: LogSeverity, message: any) {
  const logEntry: LogEntry = {
    message,
    severity,
    ...logGlobalContext,
    scope: {
      ...getScope(),
    },
  }

  // JSON.stringify for execution in Lambda, but plain objects when developing
  console.log(config.local ? logEntry : JSON.stringify(logEntry))
}

export function getFilePath() {
  const DEFAULT_FILEPATH = 'backend/src/logger/logger.helpers.ts'
  try {
    const testError = { stack: undefined }
    Error.captureStackTrace(testError)
    const stack: string = testError.stack ?? ''
    const file = stack.split('\n')[4]
    return file.substring(file.lastIndexOf('src/'), file.indexOf('.ts:'))
  } catch (e) {
    return DEFAULT_FILEPATH
  }
}

export function getScope(): Scope {
  const trace = get()

  const scope: Scope = {}

  // trace[0] => getScope, trace[1] -> wrapper function below, trace[2] -> logger
  // so we take trace[3] to get the correct scope of the caller
  const SUB_TRACE_START_INDEX = 3

  // To get the rest of the scope, we traverse down the stack and find the first named
  // function. This will allow us to handle scoping of anonymous functions/callbacks.
  for (let i = SUB_TRACE_START_INDEX; i < trace.length; i += 1) {
    const subTrace = trace[i]

    // To avoid hidden calls
    const possibleFunctionName = subTrace?.getFunctionName()
    if (IGNORED_STACK_TRACE_FUNCTIONS.has(possibleFunctionName)) {
      continue
    }

    scope.functionName = subTrace?.getFunctionName()
    scope.methodName = subTrace?.getMethodName()
    scope.className = subTrace?.getTypeName()
    scope.fileName = subTrace?.getFileName()
    scope.lineNumber = subTrace?.getLineNumber()

    if (scope.functionName || scope.methodName) {
      break
    }
  }

  return omitBy(scope, isNil)
}
