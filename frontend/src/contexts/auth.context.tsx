import React, {
  createContext,
  useState,
  useEffect,
  SetStateAction,
  Dispatch,
} from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { getUser, logout, setUserAnalytics } from 'services/auth.service'
import { initializeGA, sendPageView } from 'services/ga.service'

interface ContextProps {
  isAuthenticated: boolean
  setAuthenticated: Dispatch<SetStateAction<boolean>>
  email: string
  setEmail: Dispatch<SetStateAction<string>>
}

export const AuthContext = createContext({} as ContextProps)

const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setAuthenticated] = useState(false)
  const [isLoaded, setLoaded] = useState(false)
  const [email, setEmail] = useState('')

  const location = useLocation()

  useEffect(() => {
    // ensure that GA is loaded before sending event
    isLoaded && sendPageView(location.pathname)
  }, [location, isLoaded])

  async function initialChecks() {
    try {
      const user = await getUser()
      setAuthenticated(!!user?.email)
      setEmail(user?.email || '')

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
        }
        return Promise.reject(error)
      }
    )
  }

  useEffect(() => {
    initialChecks()
  }, [])

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
