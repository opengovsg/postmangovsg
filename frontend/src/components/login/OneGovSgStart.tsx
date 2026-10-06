import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'

import { ONE_GOV_SG_ENABLED } from 'config'

const OneGovSgStart = () => {
  const redirectStarted = useRef(false)

  useEffect(() => {
    // Menlo Security isolation can leave stale state in window.name, which breaks the OIDC redirect
    window.name = ''
    if (!ONE_GOV_SG_ENABLED || redirectStarted.current) return
    redirectStarted.current = true

    window.location.replace(
      `${process.env.REACT_APP_BACKEND_URL}/auth/one-gov-sg/login`
    )
  }, [])

  if (!ONE_GOV_SG_ENABLED) return <Navigate to="/login" replace />
  return null
}

export default OneGovSgStart
