import React from 'react'

import { POSTMAN_GUIDE_URL, POSTMAN_CONTRIBUTE_URL } from 'config'
import PrimaryButton from 'components/common/primary-button'
import AppLogo from 'assets/img/app-logo.svg'
import styles from './NavBar.module.scss'

const NavBar = () => {

  function directToSignIn() {
    window.location.href = '/signin'
  }

  return (
    <nav className={styles.navBar}>
      <div className={styles.navBrand}>
        <a className={styles.appLogo}>
          <img src={AppLogo} alt="Postman logo" />
        </a>
      </div>
      <div className={styles.navbarLinks}>
        <div className={styles.links}>
          <a className={styles.link} href={POSTMAN_CONTRIBUTE_URL} target="_blank" rel="noopener noreferrer">Contribute</a>
          <a className={styles.link} href={POSTMAN_GUIDE_URL} target="_blank" rel="noopener noreferrer">Guide</a>
        </div>
        <PrimaryButton className={styles.signInButton} onClick={directToSignIn}>Sign in</PrimaryButton>
      </div>
    </nav >
  )
}

export default NavBar
