import React, { useContext } from 'react'
import { Route, Redirect, RouteProps } from 'react-router-dom'

import { AuthContext } from 'contexts/auth.context'

const ProtectedRoute = ({ children, ...rest }: RouteProps) => {
  const { isAuthenticated } = useContext(AuthContext)

  return (
    <Route {...rest} render={({ location }) =>
      // else, redirect to main page
      isAuthenticated ?
        children :
        <Redirect
          to={{
            pathname: '/login',
            state: { from: location },
          }}
        />
    }
    />
  )
}

export default ProtectedRoute
