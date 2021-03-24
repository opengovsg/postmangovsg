import React from 'react'
import { render as _render, RenderOptions } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { MemoryRouter } from 'react-router-dom'
import AuthContextProvider from 'contexts/auth.context'

const AllProviders: React.FC = ({ children }) => (
  <I18nProvider i18n={i18n}>
    <MemoryRouter>
      <AuthContextProvider gaOptions={{ testMode: true }}>
        {children}
      </AuthContextProvider>
    </MemoryRouter>
  </I18nProvider>
)

const render = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'queries'>
) => _render(ui, { wrapper: AllProviders, ...options })

import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/auth/userinfo', (_req, res, ctx) => {
    return res(ctx.status(200))
  }),
  rest.get('/campaigns', (_req, res, ctx) => {
    return res(ctx.status(200))
  }),
  rest.post('/campaigns', (_req, res, ctx) => {
    return res(ctx.status(201))
  }),
  rest.get('/settings', (_req, res, ctx) => {
    return res(ctx.status(200))
  }),
  rest.put('/settings/announcement-version', (_req, res, ctx) => {
    return res(ctx.status(200))
  })
)

export * from '@testing-library/react'
export { rest } from 'msw'
export { render, server }
