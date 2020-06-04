import React from 'react'
import { useHistory } from 'react-router-dom'

import { GUIDE_URL, CONTRIBUTE_URL } from 'config'
import PrimaryButton from 'components/common/primary-button'
import AppLogo from 'assets/img/brand/app-logo.svg'
import AppBrandmark from 'assets/img/brand/app-brandmark.svg'
import styles from './NavBar.module.scss'

const NavBar = () => {
  const history = useHistory()

  function directToSignIn() {
    history.push('/login')
  }

  return (
    <nav className={styles.navBar}>
      <a className={styles.appLogo} href="/">
        <img src={AppLogo} alt="Postman logo" className={styles.desktop} />
        <img
          src={AppBrandmark}
          alt="Postman brandmark"
          className={styles.mobile}
        />
      </a>
      <div className={styles.navbarLinks}>
        <div className={styles.links}>
          <a
            className={styles.link}
            href={CONTRIBUTE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contribute
          </a>
          <a
            className={styles.link}
            href={GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Guide
          </a>
        </div>
        <PrimaryButton className={styles.signInButton} onClick={directToSignIn}>
          Sign in
        </PrimaryButton>
      </div>
    </nav>
  )
}

export default NavBar
