import { rest } from 'msw'
import type { State } from './interfaces'
import { USER_EMAIL, TWILIO_CREDENTIAL, TELEGRAM_CREDENTIAL } from './constants'

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

  return { state, handlers: [...mockStatsApis(state), ...mockAuthApis(state)] }
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

export { mockCommonApis }
export * from './constants'
