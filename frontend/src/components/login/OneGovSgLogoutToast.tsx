import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import styles from './OneGovSgLogoutToast.module.scss'

import MessageBlock from 'components/common/message-block'

const TOAST_DURATION_MS = 6000

// Shown after logging out of a one.gov.sg session, which Postman's logout doesn't end
const OneGovSgLogoutToast = () => {
  const { pathname, state } = useLocation()
  const navigate = useNavigate()
  const show = !!(state as { oneGovSgLoggedOut?: boolean } | null)
    ?.oneGovSgLoggedOut

  // Clearing the history state hides the toast and stops it reappearing on reload
  const dismiss = () => navigate(pathname, { replace: true, state: null })

  useEffect(() => {
    if (!show) return
    const id = setTimeout(dismiss, TOAST_DURATION_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  if (!show) return null
  return (
    <div className={styles.toast}>
      <MessageBlock
        className={styles.success}
        icon="bx bx-check-circle"
        role="status"
        onClose={dismiss}
        title="You have been logged out of Postman"
      >
        To log out from one.gov.sg, visit https://one.gov.sg
      </MessageBlock>
    </div>
  )
}

export default OneGovSgLogoutToast
