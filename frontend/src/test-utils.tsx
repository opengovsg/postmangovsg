import React from 'react'
import { render as _render, RenderOptions } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { MemoryRouter } from 'react-router-dom'
import AuthContextProvider from 'contexts/auth.context'
import { setupServer } from 'msw/node'
import { rest } from 'msw'

const CommonProviders: React.FC = ({ children }) => (
  <I18nProvider i18n={i18n}>
    <AuthContextProvider>{children}</AuthContextProvider>
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

function mockCommonApis() {
  // Start with 0 messages sent
  const totalMessagesSent = 0

  return [
    rest.get('/stats', (_req, res, ctx) => {
      return res(ctx.status(200), ctx.json({ sent: totalMessagesSent }))
    }),
  ]
}

export * from '@testing-library/react'
export { render, server, rest, mockCommonApis }
