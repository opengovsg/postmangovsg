import axios from 'axios'
import { t } from '@lingui/macro'
/**
 * React env vars are used for injecting variables at build time
 * https://create-react-app.dev/docs/adding-custom-environment-variables/#referencing-environment-variables-in-the-html
 */
const missingEnvVars = [
  'REACT_APP_TITLE',
  'REACT_APP_DESCRIPTION',
  'REACT_APP_BACKEND_URL',
  'REACT_APP_SENTRY_DSN',
  'REACT_APP_SENTRY_RELEASE',
].reduce(function (acc: string[], name: string) {
  if (process.env[name] === undefined) acc.push(name)
  return acc
}, [])
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars}`)
}

// axios global defaults
axios.defaults.baseURL = process.env.REACT_APP_BACKEND_URL as string
axios.defaults.withCredentials = true
axios.defaults.timeout = 100000 // 100 sec
//#region Set up translations
export const TRANSTEXT = {
  guideUrl: t('text.guideUrl')``,
  guideSmsUrl: t('text.guideSmsUrl')``,
  guideSmsAccountSidUrl: t('text.guideSmsAccountSidUrl')``,
  guideSmsApiKeyUrl: t('text.guideSmsApiKeyUrl')``,
  guideSmsMessagingServiceUrl: t('text.guideSmsMessagingServiceUrl')``,
  guideTelegramUrl: t('text.guideTelegramUrl')``,
  guidePowerUserUrl: t('text.guidePowerUserUrl')``,
  contactUsUrl: t('text.contactUsUrl')``,
  contributeUrl: t('text.contributeUrl')``,
  tncUrl: t('text.tncUrl')``,
  privacyUrl: t('text.privacyUrl')``,
  reportBugUrl: t('text.reportBugUrl')``,
}
//#endregion

export const GA_TRACKING_ID = process.env.REACT_APP_GA_TRACKING_ID as string
export const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN as string
export const SENTRY_RELEASE = process.env.REACT_APP_SENTRY_RELEASE as string
export const SENTRY_ENVIRONMENT =
  (process.env.REACT_APP_SENTRY_ENVIRONMENT as string) || 'development'
export const INFO_BANNER = process.env.REACT_APP_INFO_BANNER as string
