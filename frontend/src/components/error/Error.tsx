import React from 'react'

import styles from './Error.module.scss'
import appLogo from 'assets/img/app-logo.png'
const NotFound = () => {

  return (
    <React.Fragment>
      <div className={styles.topContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.textContainer}>
            <img className={styles.appLogo} src={appLogo} alt="Postman logo"></img>
            <p className={styles.title}>Page Not Found</p>
          </div>
        </div>
      </div >
    </React.Fragment>
  )
}

export default NotFound