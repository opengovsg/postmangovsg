import React, { useContext } from 'react'
import { Route, Redirect } from 'react-router-dom'

import { AuthContext } from 'contexts/auth.context'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useContext(AuthContext)

  return (
    <Route render={({ location }) =>
      // else, redirect to main page
      isAuthenticated ?
        children :
        <Redirect
          to={{
            pathname: '/',
            state: { from: location },
          }}
        />
    }
    />
  )
}

export default ProtectedRoute
