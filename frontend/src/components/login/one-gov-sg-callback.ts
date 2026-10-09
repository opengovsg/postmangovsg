import { ONE_GOV_SG_CALLBACK_PATH } from 'config'

let capturedParams: Record<string, string> | undefined

/** Capture the redirect before browser telemetry starts and remove its secrets from history. */
export const captureOneGovSgCallback = (): void => {
  if (window.location.pathname !== ONE_GOV_SG_CALLBACK_PATH) return
  capturedParams = Object.fromEntries(
    new URLSearchParams(window.location.search)
  )
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.hash}`
  )
}

export const takeOneGovSgCallbackParams = (): Record<string, string> => {
  // Also covers callbacks reached after app startup (for example, via client navigation)
  if (!capturedParams) captureOneGovSgCallback()
  const params = capturedParams ?? {}
  capturedParams = undefined
  return params
}
