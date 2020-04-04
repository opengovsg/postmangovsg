import React, { createContext, useState, useEffect } from 'react'
import { getIsLoggedIn } from 'services/auth.service'

const defaultValue = {
  isAuthenticated: false,
  setAuthenticated: {},
  email: null,
  setEmail: {},
}

export const AuthContext = createContext(defaultValue)

const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setAuthenticated] = useState(false)
  const [isLoaded, setLoaded] = useState(false)
  const [email, setEmail] = useState(null)

  async function initialChecks() {
    const isLoggedIn = await getIsLoggedIn()
    setAuthenticated(isLoggedIn)
    setLoaded(true)
  }

  useEffect(() => {
    initialChecks()
  }, [])

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      setAuthenticated,
      email,
      setEmail,
    }}>
      {isLoaded && children}
    </AuthContext.Provider>
  )
}

export default AuthContextProvider
