import { ReactNode, useContext } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { AuthContext } from 'contexts/auth.context'

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useContext(AuthContext)
  const { pathname } = useLocation()

  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/" state={{ from: pathname }} />
  )
}

export default ProtectedRoute
