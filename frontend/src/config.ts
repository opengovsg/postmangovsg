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
export const LINKS = {
  guideUrl: t('link.guideUrl')``,
  guideEmailPasswordProtectedUrl: t('link.guideEmailPasswordProtectedUrl')``,
  guideSmsUrl: t('link.guideSmsUrl')``,
  guideSmsAccountSidUrl: t('link.guideSmsAccountSidUrl')``,
  guideSmsApiKeyUrl: t('link.guideSmsApiKeyUrl')``,
  guideSmsMessagingServiceUrl: t('link.guideSmsMessagingServiceUrl')``,
  guideTelegramUrl: t('link.guideTelegramUrl')``,
  guidePowerUserUrl: t('link.guidePowerUserUrl')``,
  guideDemoUrl: t('link.guideDemoUrl')``,
  guideRemoveDuplicatesUrl: t('link.guideRemoveDuplicatesUrl')``,
  contactUsUrl: t('link.contactUsUrl')``,
  contributeUrl: t('link.contributeUrl')``,
  tncUrl: t('link.tncUrl')``,
  privacyUrl: t('link.privacyUrl')``,
  reportBugUrl: t('link.reportBugUrl')``,
  customFromAddressRequestUrl: t('link.customFromAddressRequestUrl')``,
  demoTelegramBotUrl: t('link.demoTelegramBotUrl')``,
  demoVideoUrl: t('link.demoVideoUrl')``,
}
export const DEFAULT_MAIL_FROM = t('defaultMailFrom')``
// Semi-colon separated list of allowed image source hostnames
export const ALLOWED_IMAGE_SOURCES = t('allowedImageSources')``
//#endregion

export const GA_TRACKING_ID = process.env.REACT_APP_GA_TRACKING_ID as string
export const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN as string
export const SENTRY_RELEASE = process.env.REACT_APP_SENTRY_RELEASE as string
export const SENTRY_ENVIRONMENT =
  (process.env.REACT_APP_SENTRY_ENVIRONMENT as string) || 'development'
export const INFO_BANNER = process.env.REACT_APP_INFO_BANNER as string

// Feature Launch Announcements
export const ANNOUNCEMENT = {
  version: t('announcement.version')``,
  title: t('announcement.title')``,
  subtext: t('announcement.subtext')``,
  imageUrl: t('announcement.imageUrl')``,
  readGuideUrl: t('announcement.readGuideUrl')``,
}
