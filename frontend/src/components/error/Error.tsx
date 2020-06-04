import React from 'react'

import styles from './Error.module.scss'
import appLogo from 'assets/img/brand/app-logo.svg'
const Error = () => {
  return (
    <React.Fragment>
      <div className={styles.topContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.textContainer}>
            <a href="/">
              <img
                className={styles.appLogo}
                src={appLogo}
                alt="Postman logo"
              ></img>
            </a>
            <h1>Page Not Found!</h1>
          </div>
        </div>
      </div>
    </React.Fragment>
  )
}

export default Error
