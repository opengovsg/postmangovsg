import React, { createContext, useState, useEffect, SetStateAction, Dispatch } from 'react'
import { getIsLoggedIn } from 'services/auth.service'

interface ContextProps {
 isAuthenticated: boolean;
 setAuthenticated: Dispatch<SetStateAction<boolean>>;
 email: string;
 setEmail: Dispatch<SetStateAction<string>>;
}

export const AuthContext = createContext({} as ContextProps)

const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setAuthenticated] = useState(false)
  const [isLoaded, setLoaded] = useState(false)
  const [email, setEmail] = useState('')

  async function initialChecks() {
    try {
      const isLoggedIn = await getIsLoggedIn()
      setAuthenticated(isLoggedIn)
    } catch(err){
      // is unauthorized
    }
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
