import { rest } from 'msw'
import type { State } from './interfaces'
import {
  USER_EMAIL,
  TWILIO_CREDENTIAL,
  TELEGRAM_CREDENTIAL,
  DEFAULT_FROM,
} from './constants'

function mockCommonApis(initialState?: Partial<State>) {
  const state: State = {
    // Stats
    totalMessagesSent: 0,

    // Auth
    users: [
      {
        api_key: 'test-api-key',
        creds: [
          { label: TWILIO_CREDENTIAL, type: 'SMS' },
          { label: TELEGRAM_CREDENTIAL, type: 'TELEGRAM' },
        ],
        demo: {
          num_demo_sms: 0,
          num_demo_telegram: 0,
          is_displayed: false,
        },
        email: USER_EMAIL,
        id: 1,
      },
    ],
    curUserId: 0, // start unauthenticated; 1-indexed

    ...initialState, // Allow tests to override the initial state
  }

  return {
    state,
    handlers: [
      ...mockStatsApis(state),
      ...mockAuthApis(state),
      ...mockSettingsApis(state),
    ],
  }
}

function mockStatsApis(state: State) {
  return [
    rest.get('/stats', (_req, res, ctx) => {
      return res(ctx.status(200), ctx.json({ sent: state.totalMessagesSent }))
    }),
  ]
}

function mockAuthApis(state: State) {
  return [
    rest.get('/auth/userinfo', (_req, res, ctx) => {
      if (!state.curUserId) {
        return res(ctx.status(200), ctx.json({}))
      }
      const { email, id } = state.users[state.curUserId - 1]
      return res(ctx.status(200), ctx.json({ email, id }))
    }),
  ]
}

function mockSettingsApis(state: State) {
  return [
    rest.get('/settings', (_req, res, ctx) => {
      const { creds, demo, api_key } = state.users[state.curUserId - 1]
      return res(
        ctx.status(200),
        ctx.json({
          creds,
          demo,
          has_api_key: !!api_key,
        })
      )
    }),
    rest.get('/settings/email/from', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          from: [DEFAULT_FROM],
        })
      )
    }),
    rest.get('/settings/sms/credentials', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json(
          state.users[state.curUserId - 1].creds
            .filter((cred) => cred.type === 'SMS')
            .map((cred) => cred.label)
        )
      )
    }),
    rest.get('/settings/telegram/credentials', (_req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json(
          state.users[state.curUserId - 1].creds
            .filter((cred) => cred.type === 'TELEGRAM')
            .map((cred) => cred.label)
        )
      )
    }),
  ]
}

export { mockCommonApis }
export * from './constants'
