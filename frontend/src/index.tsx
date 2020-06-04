import React from 'react'
import ReactDOM from 'react-dom'
import * as Sentry from '@sentry/browser'
import { SENTRY_DSN, SENTRY_RELEASE } from 'config'
import App from './App'

Sentry.init({ dsn: SENTRY_DSN, release: SENTRY_RELEASE })

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
