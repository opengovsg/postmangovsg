import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'

import LoginInput from '../login-input'
import { captureOneGovSgCallback } from '../one-gov-sg-callback'

import { AuthContext } from 'contexts/auth.context'
import 'locales'
import { getUser, loginWithOneGovSg } from 'services/auth.service'

jest.mock('services/auth.service', () => ({
  getUser: jest.fn(),
  loginWithOneGovSg: jest.fn(),
  setUserAnalytics: jest.fn(),
}))

const Campaigns = () => {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>Back from campaigns</button>
}

test('exchanges captured params and replaces the callback history entry', async () => {
  const callbackUrl =
    '/login/one-gov-sg/callback?code=secret-code&state=secret-state&iss=issuer'
  window.history.replaceState(null, '', callbackUrl)
  captureOneGovSgCallback()
  ;(loginWithOneGovSg as jest.Mock).mockResolvedValue(undefined)
  ;(getUser as jest.Mock).mockResolvedValue({
    email: 'officer@agency.gov.sg',
    id: 1,
    experimental_data: {},
  })

  render(
    <I18nProvider i18n={i18n}>
      <AuthContext.Provider
        value={{
          isAuthenticated: false,
          setAuthenticated: jest.fn(),
          email: '',
          setEmail: jest.fn(),
          experimentalData: {},
          setExperimentalData: jest.fn(),
        }}
      >
        <MemoryRouter initialEntries={['/prior', callbackUrl]} initialIndex={1}>
          <Routes>
            <Route path="/prior" element={<span>Prior page</span>} />
            <Route path="/login/one-gov-sg/callback" element={<LoginInput />} />
            <Route path="/campaigns" element={<Campaigns />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </I18nProvider>
  )

  await waitFor(() => expect(loginWithOneGovSg).toHaveBeenCalledTimes(1))
  expect(loginWithOneGovSg).toHaveBeenCalledWith({
    code: 'secret-code',
    state: 'secret-state',
    iss: 'issuer',
  })
  expect(window.location.search).toBe('')

  const back = await screen.findByRole('button', {
    name: 'Back from campaigns',
  })
  // react-router 6.3 ignores navigate() until the component's useEffect runs,
  // which can be after the button is already in the DOM.
  await waitFor(() => {
    fireEvent.click(back)
    expect(screen.getByText('Prior page')).toBeInTheDocument()
  })
  window.history.replaceState(null, '', '/')
})
