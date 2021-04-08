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

const server = setupServer()

interface State {
  // Stats
  totalMessagesSent: number

  // Auth
  users: User[]
  curUserId: number
}

interface User {
  api_key: string
  creds: Credential[]
  demo: {
    num_demo_sms: number
    num_demo_telegram: number
    is_displayed: boolean
  }
  email: string
  id: number
}

interface Credential {
  label: string
  type: string
}

function mockCommonApis(initialState: Partial<State>) {
  const state: State = {
    // Stats
    totalMessagesSent: 0,

    // Auth
    users: [],
    curUserId: 0, // start unauthenticated; 1-indexed

    ...initialState, // Allow tests to override the initial state
  }

  return [
    // Stats
    rest.get('/stats', (_req, res, ctx) => {
      return res(ctx.status(200), ctx.json({ sent: state.totalMessagesSent }))
    }),

    // Auth
    rest.get('/auth/userinfo', (_req, res, ctx) => {
      if (!state.curUserId) {
        return res(ctx.status(200), ctx.json({}))
      }
      const { email, id } = state.users[state.curUserId - 1]
      return res(ctx.status(200), ctx.json({ email, id }))
    }),
  ]
}

export * from '@testing-library/react'
export { render, server, rest, mockCommonApis }
