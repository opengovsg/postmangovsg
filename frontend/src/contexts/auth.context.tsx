import { datadogRum } from '@datadog/browser-rum'
import axios from 'axios'
import { createContext, useState, useEffect } from 'react'
import type { ReactNode, Dispatch, SetStateAction } from 'react'

import { getUser, logout, setUserAnalytics } from 'services/auth.service'

interface ContextProps {
  isAuthenticated: boolean
  setAuthenticated: Dispatch<SetStateAction<boolean>>
  email: string
  setEmail: Dispatch<SetStateAction<string>>
}

export const AuthContext = createContext({} as ContextProps)

const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setAuthenticated] = useState(false)
  const [isLoaded, setLoaded] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function initialChecks() {
      try {
        const user = await getUser()
        setAuthenticated(!!user?.email)
        setEmail(user?.email || '')

        setUserAnalytics(user)
      } catch (err) {
        // is unauthorized
      }
      setLoaded(true)

      // Set up axios interceptor to redirect to login if any axios requests are unauthorized
      axios.interceptors.response.use(
        function (response) {
          return response
        },
        async function (error) {
          if (error.response && error.response.status === 401) {
            await logout()
            setAuthenticated(false)
          }
          return Promise.reject(error)
        }
      )
    }
    void initialChecks()
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !email) return
    datadogRum.setUser({
      email,
    })
    datadogRum.startSessionReplayRecording()
    return () => {
      datadogRum.stopSessionReplayRecording()
      datadogRum.clearUser()
    }
  }, [isAuthenticated, email])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        setAuthenticated,
        email,
        setEmail,
      }}
    >
      {isLoaded && children}
    </AuthContext.Provider>
  )
}

export default AuthContextProvider
