import { useContext } from 'react'
import { Route, Redirect } from 'react-router-dom'

import { AuthContext } from 'contexts/auth.context'

import type { RouteProps } from 'react-router-dom'

const ProtectedRoute = ({ children, ...rest }: RouteProps) => {
  const { isAuthenticated } = useContext(AuthContext)

  return (
    <Route
      {...rest}
      render={({ location }) =>
        // else, redirect to main page
        isAuthenticated ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: '/',
              state: { from: location },
            }}
          />
        )
      }
    />
  )
}

export default ProtectedRoute
