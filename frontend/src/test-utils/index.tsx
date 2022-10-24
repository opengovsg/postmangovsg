import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render as _render, RenderOptions } from '@testing-library/react'
import AuthContextProvider from 'contexts/auth.context'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

interface RouterOptions {
  initialIndex?: number
  initialEntries?: string[]
}

// Wraps the component to be rendered with context providers
// that are required globally
const render = (
  ui: ReactElement,
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

export * from './api'
export * from '@testing-library/react'
export { render, rest, server }
