import ReactGA from 'react-ga'
import { GA_TRACKING_ID } from 'config'

export const GA_USER_EVENTS = {
  RESEND_OTP: 'Resend OTP',
  GENERATE_NEW_API_KEY: 'Generate new API key',
  DOWNLOAD_SAMPLE_FILE: 'Download sample file',
  ENTER_NEW_CREDENTIALS: 'Enter new credentials',
  USE_SEND_RATE: 'Use send rate',
  FINISH_CAMPAIGN_LATER: 'Finish campaign later',
  PAUSE_SENDING: 'Pause sending',
  RETRY_RESUME_SENDING:'Retry/Resume sending',
}

export function initializeGA() {
  ReactGA.initialize(GA_TRACKING_ID, { debug: true })
}

export function setGAUserId(id: number | null) {
  ReactGA.set({ id })
}

export function sendPageView(path: string) {
  ReactGA.pageview(path)
}

export function sendOutboundLinkEvent(label: string) {
  return () => {ReactGA.outboundLink({ label }, () => null)}
}

export function sendUserEvent(action: string, label?: string) {
  ReactGA.event({
    category: 'User',
    action,
    label,
  })
}

export function sendTiming(category: string, variable: string, value: number) {
  ReactGA.timing({
    category,
    variable,
    value, // in milliseconds
  })
}

export function sendException(description: string) {
  ReactGA.exception({ description })
}