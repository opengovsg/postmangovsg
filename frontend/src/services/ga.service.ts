import ReactGA from 'react-ga'
import { GA_INITIALIZE_OPTIONS, GA_TRACKING_ID } from 'config'

export const GA_USER_EVENTS = {
  RESEND_OTP: 'Resend OTP',
  GENERATE_NEW_API_KEY: 'Generate new API key',
  DOWNLOAD_SAMPLE_FILE: 'Download sample file',
  ENTER_NEW_CREDENTIALS: 'Enter new credentials',
  USE_SEND_RATE: 'Use send rate',
  FINISH_CAMPAIGN_LATER: 'Finish campaign later',
  PAUSE_SENDING: 'Pause sending',
  RETRY_RESUME_SENDING: 'Retry/Resume sending',
  ADD_FROM_ADDRESS: 'Add From Address',
  UPDATE_FROM_ADDRESS: 'Update From Address',
  DOWNLOAD_DELIVERY_REPORT: 'Download delivery report',
  NEW_USER_TRY_EMAIL: 'New user try email',
  NEW_USER_TRY_SMS_TELEGRAM: 'New user try SMS or Telegram',
  OPEN_DUPLICATE_MODAL: 'Open duplicate modal',
  COMPLETE_DUPLICATE: 'Complete campaign duplication',
}

export function initializeGA() {
  ReactGA.initialize(GA_TRACKING_ID, GA_INITIALIZE_OPTIONS)
}

export function setGAUserId(userId: number | null) {
  ReactGA.set({ userId })
}

export function sendPageView(path: string) {
  ReactGA.pageview(path)
}

export function sendUserEvent(action: string, label?: string, value?: number) {
  ReactGA.event({
    category: 'User',
    action,
    label,
    value,
  })
}

export function sendTiming(category: string, variable: string, value: number) {
  ReactGA.timing({
    category,
    variable,
    value: Math.ceil(value), // in integer milliseconds
  })
}

export function sendException(description: string) {
  ReactGA.exception({ description })
}
