// Import these before everything else
import 'react-app-polyfill/stable'
import 'locales'

import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import * as Sentry from '@sentry/browser'

import { StrictMode } from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'

// Locales

// Contexts

import App from './App'

import { SENTRY_DSN, SENTRY_RELEASE, SENTRY_ENVIRONMENT } from 'config'
import AuthContextProvider from 'contexts/auth.context'

Sentry.init({
  dsn: SENTRY_DSN,
  release: SENTRY_RELEASE,
  environment: SENTRY_ENVIRONMENT,
})

ReactDOM.render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider i18n={i18n}>
        <AuthContextProvider>
          <App />
        </AuthContextProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
  document.getElementById('root')
)
