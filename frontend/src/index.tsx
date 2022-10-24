// Import these before everything else
import 'react-app-polyfill/stable'
import 'locales'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import * as Sentry from '@sentry/browser'
import { SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE } from 'config'
import AuthContextProvider from 'contexts/auth.context'

// Locales
// Contexts
import App from './App'

Sentry.init({
  dsn: SENTRY_DSN,
  release: SENTRY_RELEASE,
  environment: SENTRY_ENVIRONMENT,
})

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)
root.render(
  <BrowserRouter>
    <StrictMode>
      <I18nProvider i18n={i18n}>
        <AuthContextProvider>
          <App />
        </AuthContextProvider>
      </I18nProvider>
    </StrictMode>
  </BrowserRouter>
)
