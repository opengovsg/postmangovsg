import React from 'react'
import ReactDOM from 'react-dom'
import * as Sentry from '@sentry/browser'
import { SENTRY_DSN } from 'config'
import App from './App'

Sentry.init({ dsn: SENTRY_DSN })

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
