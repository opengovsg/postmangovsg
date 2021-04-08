import { rest } from 'msw'
import type { State } from './interfaces'

function mockCommonApis(initialState?: Partial<State>) {
  const state: State = {
    // Stats
    totalMessagesSent: 0,

    // Auth
    users: [],
    curUserId: 0, // start unauthenticated; 1-indexed

    ...initialState, // Allow tests to override the initial state
  }

  return [...mockStatsApis(state), ...mockAuthApis(state)]
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
