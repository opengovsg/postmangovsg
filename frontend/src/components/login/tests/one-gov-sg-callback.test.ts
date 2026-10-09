import {
  captureOneGovSgCallback,
  takeOneGovSgCallbackParams,
} from '../one-gov-sg-callback'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

test('captures callback values and clears the current history entry', () => {
  const historyState = { idx: 2 }
  window.history.replaceState(
    historyState,
    '',
    '/login/one-gov-sg/callback?code=secret-code&state=secret-state&iss=issuer'
  )

  captureOneGovSgCallback()

  expect(window.location.pathname).toBe('/login/one-gov-sg/callback')
  expect(window.location.search).toBe('')
  expect(window.history.state).toEqual(historyState)
  expect(takeOneGovSgCallbackParams()).toEqual({
    code: 'secret-code',
    state: 'secret-state',
    iss: 'issuer',
  })
})

test('leaves a normal login URL alone', () => {
  window.history.replaceState(null, '', '/login?from=home')
  captureOneGovSgCallback()
  expect(window.location.search).toBe('?from=home')
})
