import React, {
  createContext,
  useState,
  useEffect,
  SetStateAction,
  Dispatch,
} from 'react'
import axios from 'axios'
import { getUserEmail, logout } from 'services/auth.service'

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

  async function initialChecks() {
    try {
      const email = await getUserEmail()
      setAuthenticated(!!email)
      setEmail(email || '')
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
