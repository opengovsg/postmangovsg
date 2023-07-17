// Import these before everything else
import 'react-app-polyfill/stable'
import 'locales'

import { datadogRum } from '@datadog/browser-rum'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import * as Sentry from '@sentry/browser'

import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Locales

// Contexts

import App from './App'

import { SENTRY_DSN, SENTRY_RELEASE, APP_ENV } from 'config'
import AuthContextProvider from 'contexts/auth.context'

Sentry.init({
  dsn: SENTRY_DSN,
  release: SENTRY_RELEASE,
  environment: APP_ENV,
})

if (APP_ENV === 'production' || APP_ENV === 'staging') {
  datadogRum.init({
    applicationId: 'cb688eb3-9630-4afa-aeac-64bba039ca6f',
    clientToken: 'pubaa5878fabb0309c23c99df19ef5cc1c0',
    site: 'datadoghq.com',
    service: 'postman',
    env: APP_ENV,
    // Specify a version number to identify the deployed version of your application in Datadog
    // version: '1.0.0',
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask-user-input',
  })
}

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)
root.render(
  <BrowserRouter>
    <I18nProvider i18n={i18n}>
      <AuthContextProvider>
        <App />
      </AuthContextProvider>
    </I18nProvider>
  </BrowserRouter>
)
