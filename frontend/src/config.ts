import { i18n } from '@lingui/core'
import { t } from '@lingui/macro'
import axios from 'axios'

import type { InitializeOptions } from 'react-ga'

import { sha256 } from './services/crypto.service'

// Re-export these later on as constants
let gaInitializeOptions: InitializeOptions
let gaTrackingId: string
let announcementActive: string

/**
 * Configs differentiated between environments
 */
if (process.env.NODE_ENV === 'test') {
  // Define a dummy tracking ID and enable test mode for Google Analytics during tests
  gaTrackingId = 'UA-XXX-XX'
  gaInitializeOptions = {
    testMode: true,
  }

  // Disable announcements in test environments
  announcementActive = 'false'
} else {
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

  // react-ga (Google Analytics) configs
  gaTrackingId = process.env.REACT_APP_GA_TRACKING_ID as string
  gaInitializeOptions = {
    debug: false, // Set to true only on development
  }

  // `REACT_APP_ANNOUNCEMENT_ACTIVE` must be set to `true` in Amplify if we want the modal to display
  announcementActive = process.env.REACT_APP_ANNOUNCEMENT_ACTIVE as string
}

/**
 * Configs common across environments (production, development, test)
 */
axios.defaults.withCredentials = true
axios.defaults.timeout = 100000 // 100 sec
//#region Set up translations
export const LINKS = {
  guideUrl: t`link.guideUrl`,
  guideEmailPasswordProtectedUrl: t`link.guideEmailPasswordProtectedUrl`,
  guideEmailImageUrl: t`link.guideEmailImageUrl`,
  guideSmsUrl: t`link.guideSmsUrl`,
  guideSmsAccountSidUrl: t`link.guideSmsAccountSidUrl`,
  guideSmsApiKeyUrl: t`link.guideSmsApiKeyUrl`,
  guideSmsMessagingServiceUrl: t`link.guideSmsMessagingServiceUrl`,
  guideTelegramUrl: t`link.guideTelegramUrl`,
  guidePowerUserUrl: t`link.guidePowerUserUrl`,
  guideDemoUrl: t`link.guideDemoUrl`,
  guideRemoveDuplicatesUrl: t`link.guideRemoveDuplicatesUrl`,
  contactUsUrl: t`link.contactUsUrl`,
  contributeUrl: t`link.contributeUrl`,
  tncUrl: t`link.tncUrl`,
  privacyUrl: t`link.privacyUrl`,
  reportBugUrl: t`link.reportBugUrl`,
  customFromAddressRequestUrl: t`link.customFromAddressRequestUrl`,
  demoTelegramBotUrl: t`link.demoTelegramBotUrl`,
  demoVideoUrl: t`link.demoVideoUrl`,
  featureRequestUrl: t`link.featureRequestUrl`,
  uploadLogoUrl: t`link.uploadLogoUrl`,
}
export const DEFAULT_MAIL_FROM = t`defaultMailFrom`
// Semi-colon separated list of allowed image source hostnames
export const ALLOWED_IMAGE_SOURCES = t`allowedImageSources`
//#endregion

export const GA_INITIALIZE_OPTIONS = gaInitializeOptions
export const GA_TRACKING_ID = gaTrackingId
export const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN as string
export const SENTRY_RELEASE = process.env.REACT_APP_SENTRY_RELEASE as string
export const SENTRY_ENVIRONMENT =
  (process.env.REACT_APP_SENTRY_ENVIRONMENT as string) || 'development'
export const INFO_BANNER = process.env.REACT_APP_INFO_BANNER as string
export const INFO_BANNER_COLOR = process.env
  .REACT_APP_INFO_BANNER_COLOR as string

export const PHONEBOOK_FEATURE_ENABLE = process.env
  .REACT_APP_PHONEBOOK_FEATURE_ENABLE as string

// Feature Launch Announcements
// If `isActive` is false, the modal will not proc for ANY user
export const ANNOUNCEMENT: Record<string, any> = {
  isActive: announcementActive === 'true',
  title: t`announcement.title`,
  subtext: t`announcement.subtext`,
  mediaUrl: t`announcement.mediaUrl`,
  primaryButtonUrl: t`announcement.primaryButtonUrl`,
  primaryButtonText: t`announcement.primaryButtonText`,
  secondaryButtonUrl: t`announcement.secondaryButtonUrl`,
  secondaryButtonText: t`announcement.secondaryButtonText`,
}

// Users of getAnnouncementVersion have to await it.
// Lazily compute the announcement version and memoize it for future use.
let memoizedVersion: string | null = null
export async function getAnnouncementVersion(): Promise<string> {
  if (memoizedVersion !== null) {
    return memoizedVersion
  }
  const HASHABLE_KEYS = [
    'title',
    'subtext',
    'mediaUrl',
    'primaryButtonUrl',
    'primaryButtonText',
    'secondaryButtonUrl',
    'secondaryButtonText',
  ]
  const translations = HASHABLE_KEYS.map((key) => i18n._(ANNOUNCEMENT[key]))
  const concatenatedStr = translations.join(';')
  memoizedVersion = await sha256(concatenatedStr)
  return memoizedVersion
}
