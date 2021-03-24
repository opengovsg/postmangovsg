// Import these before everything else
import 'react-app-polyfill/stable'
import 'locales'

import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/browser'
import { SENTRY_DSN, SENTRY_RELEASE, SENTRY_ENVIRONMENT } from 'config'

// Locales
import { i18n } from '@lingui/core'

// Contexts
import AuthContextProvider from 'contexts/auth.context'
import { I18nProvider } from '@lingui/react'

import App from './App'

Sentry.init({
  dsn: SENTRY_DSN,
  release: SENTRY_RELEASE,
  environment: SENTRY_ENVIRONMENT,
})

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider i18n={i18n}>
        <AuthContextProvider>
          <App />
        </AuthContextProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
)
