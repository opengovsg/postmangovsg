import React from 'react'

import styles from './Error.module.scss'
import { PrimaryButton, TextButton } from 'components/common'
import { useHistory } from 'react-router-dom'

const Error = () => {
  const history = useHistory()

  return (
    <React.Fragment>
      <div className={styles.topContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.textContainer}>
            <h1>Page Not Found!</h1>
            <p>
              The link you followed may be broken, or the page may not exist.
            </p>
            <span className={styles.actions}>
              <TextButton
                className={styles.action}
                onClick={() => history.push('/campaigns')}
              >
                Go to dashboard
              </TextButton>
              <PrimaryButton className={styles.action} onClick={history.goBack}>
                Go back to previous page
              </PrimaryButton>
            </span>
          </div>
        </div>
      </div>
    </React.Fragment>
  )
}

export default Error
