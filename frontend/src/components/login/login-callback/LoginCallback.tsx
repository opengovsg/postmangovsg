import React, { useContext, useEffect, useState } from 'react'

import { AuthContext } from 'contexts/auth.context'

import { getUser, loginWithSgid, setUserAnalytics } from 'services/auth.service'

import { sendException } from 'services/ga.service'

const DASHBOARD_PAGE = '/'
const LOGIN_PAGE = '/ogp-login'

const LoginCallback = () => {
  const {
    setAuthenticated,
    setEmail: setAuthContextEmail,
    setExperimentalData,
  } = useContext(AuthContext)

  const [isLoading, setIsLoading] = useState(false)
  const params = new URL(window.location.href).searchParams
  const code = params.get('code')

  useEffect(() => {
    async function login(code: string) {
      setIsLoading(true)
      try {
        await loginWithSgid(code)
        setAuthenticated(true)
        const user = await getUser()
        if (!user) {
          throw new Error('Unable to fetch user data!')
        }
        setAuthContextEmail(user.email)
        setExperimentalData(
          user?.experimental_data as {
            [feature: string]: Record<string, string>
          }
        )
        setUserAnalytics(user)
        setIsLoading(false)
        window.location.replace(DASHBOARD_PAGE)
      } catch (e) {
        setIsLoading(false)
        console.error(e)
        sendException((e as Error).message)
        window.location.replace(
          LOGIN_PAGE + `?errorCode=Unable to log in via Singpass`
        )
      }
    }

    void login(code ?? '')
  }, [code, setAuthContextEmail, setAuthenticated, setExperimentalData])

  return <React.Fragment>{isLoading && <h3>Loading</h3>}</React.Fragment>
}

export default LoginCallback
