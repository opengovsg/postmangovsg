import { datadogRum } from '@datadog/browser-rum'
import axios from 'axios'
import { createContext, useState, useEffect } from 'react'
import type { ReactNode, Dispatch, SetStateAction } from 'react'
import { useLocation } from 'react-router-dom'

import { ChannelType } from 'classes'

import { getUser, logout, setUserAnalytics } from 'services/auth.service'
import { initializeGA, sendPageView } from 'services/ga.service'

interface ContextProps {
  isAuthenticated: boolean
  setAuthenticated: Dispatch<SetStateAction<boolean>>
  email: string
  setEmail: Dispatch<SetStateAction<string>>
  experimentalData: { [key: string]: Record<string, string> }
  setExperimentalData: Dispatch<
    SetStateAction<{ [key: string]: Record<string, string> }>
  >
}

export const AuthContext = createContext({} as ContextProps)

const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setAuthenticated] = useState(false)
  const [isLoaded, setLoaded] = useState(false)
  const [email, setEmail] = useState('')
  const [experimentalData, setExperimentalData] = useState<{
    [key: string]: Record<string, string>
  }>({})

  const location = useLocation()

  useEffect(() => {
    // ensure that GA is loaded before sending event
    isLoaded && sendPageView(location.pathname)
  }, [location, isLoaded])

  useEffect(() => {
    async function initialChecks() {
      try {
        const user = await getUser()
        setAuthenticated(!!user?.email)
        setEmail(user?.email || '')
        setExperimentalData(user?.experimental_data || {})

        initializeGA()
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
    if (email) {
      datadogRum.setUser({
        email,
      })
    }
  }, [email])

  useEffect(() => {
    if (email && experimentalData && experimentalData[ChannelType.Govsg]) {
      datadogRum.startSessionReplayRecording()
    }
  }, [email, experimentalData])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        setAuthenticated,
        email,
        setEmail,
        experimentalData,
        setExperimentalData,
      }}
    >
      {isLoaded && children}
    </AuthContext.Provider>
  )
}

export default AuthContextProvider
