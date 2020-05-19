import React from 'react'

import { GUIDE_URL, CONTRIBUTE_URL } from 'config'
import PrimaryButton from 'components/common/primary-button'
import AppLogo from 'assets/img/brand/app-logo.svg'
import styles from './NavBar.module.scss'

const NavBar = () => {

  function directToSignIn() {
    window.location.href = '/signin'
  }

  return (
    <nav className={styles.navBar}>
      <a className={styles.appLogo}>
        <img src={AppLogo} alt="Postman logo" />
      </a>
      <div className={styles.navbarLinks}>
        <div className={styles.links}>
          <a className={styles.link} href={CONTRIBUTE_URL} target="_blank" rel="noopener noreferrer">Contribute</a>
          <a className={styles.link} href={GUIDE_URL} target="_blank" rel="noopener noreferrer">Guide</a>
        </div>
        <PrimaryButton className={styles.signInButton} onClick={directToSignIn}>Sign in</PrimaryButton>
      </div>
    </nav >
  )
}

export default NavBar
