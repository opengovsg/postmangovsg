import React from 'react'
import { render as _render, RenderOptions } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { MemoryRouter } from 'react-router-dom'
import AuthContextProvider from 'contexts/auth.context'
import { setupServer } from 'msw/node'

const CommonProviders: React.FC = ({ children }) => (
  <I18nProvider i18n={i18n}>
    <AuthContextProvider gaOptions={{ testMode: true }}>
      {children}
    </AuthContextProvider>
  </I18nProvider>
)

interface RouterOptions {
  initialIndex?: number
  initialEntries?: string[]
}

const render = (
  ui: React.ReactElement,
  options?: {
    router?: RouterOptions
    render?: Omit<RenderOptions, 'queries'>
  }
) =>
  _render(
    <MemoryRouter {...options?.router}>
      <CommonProviders>{ui}</CommonProviders>
    </MemoryRouter>,
    options?.render
  )

// Set up common API endpoints
const server = setupServer()

export * from '@testing-library/react'
export { rest } from 'msw'
export { render, server }
