import React from 'react'
import { useHistory } from 'react-router-dom'
import { OutboundLink } from 'react-ga'

import { CONTRIBUTE_URL, TRANSTEXT } from 'config'
import PrimaryButton from 'components/common/primary-button'
import AppLogo from 'assets/img/brand/app-logo.svg'
import AppBrandmark from 'assets/img/brand/app-brandmark.svg'
import styles from './NavBar.module.scss'
import { i18n } from 'locales'

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
          <OutboundLink
            className={styles.link}
            eventLabel={CONTRIBUTE_URL}
            to={CONTRIBUTE_URL}
            target="_blank"
          >
            Contribute
          </OutboundLink>
          <OutboundLink
            className={styles.link}
            eventLabel={i18n._(TRANSTEXT.guideUrl)}
            to={i18n._(TRANSTEXT.guideUrl)}
            target="_blank"
          >
            Guide
          </OutboundLink>
        </div>
        <PrimaryButton className={styles.signInButton} onClick={directToSignIn}>
          Sign in
        </PrimaryButton>
      </div>
    </nav>
  )
}

export default NavBar
