import React from 'react'
import { render as _render, RenderOptions } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { MemoryRouter } from 'react-router-dom'
import AuthContextProvider from 'contexts/auth.context'
import { setupServer } from 'msw/node'
import { rest } from 'msw'

interface RouterOptions {
  initialIndex?: number
  initialEntries?: string[]
}

// Wraps the component to be rendered with context providers
// that are required globally
const render = (
  ui: React.ReactElement,
  options?: {
    router?: RouterOptions
    render?: Omit<RenderOptions, 'queries'>
  }
) =>
  _render(
    <MemoryRouter {...options?.router}>
      <I18nProvider i18n={i18n}>
        <AuthContextProvider>{ui}</AuthContextProvider>
      </I18nProvider>
    </MemoryRouter>,
    options?.render
  )

const server = setupServer()

export * from '@testing-library/react'
export * from './api'
export { render, server, rest }
