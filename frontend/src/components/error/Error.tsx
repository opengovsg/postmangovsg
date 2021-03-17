import React from 'react'

import styles from './Error.module.scss'
import { PrimaryButton, TextButton } from 'components/common'
import { useHistory } from 'react-router-dom'

const Error = () => {
  const history = useHistory()

  return (
    <div className={styles.topContainer}>
      <div className={styles.innerContainer}>
        <div className={styles.textContainer}>
          <h2 className={styles.title}>Page Not Found!</h2>
          <p className={styles.description}>
            The link you followed may be broken, or the page may not exist.
          </p>
          <span className={styles.actions}>
            <PrimaryButton className={styles.action} onClick={history.goBack}>
              Go back to previous page
            </PrimaryButton>
            <TextButton
              className={styles.action}
              onClick={() => history.push('/campaigns')}
            >
              Go to dashboard
            </TextButton>
          </span>
        </div>
      </div>
    </div>
  )
}

export default Error
