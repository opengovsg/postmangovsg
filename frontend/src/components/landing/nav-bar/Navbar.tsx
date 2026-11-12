import { i18n } from '@lingui/core'
import { useNavigate } from 'react-router-dom'

import styles from './NavBar.module.scss'

import AppBrandmark from 'assets/img/brand/app-brandmark.svg'
import AppLogo from 'assets/img/brand/app-logo.svg'
import PrimaryButton from 'components/common/primary-button'
import { LINKS } from 'config'

const NavBar = () => {
  const navigate = useNavigate()

  function directToSignIn() {
    navigate('/login')
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
            href={i18n._(LINKS.contributeUrl)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contribute
          </a>
          <a
            className={styles.link}
            href={i18n._(LINKS.guideUrl)}
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
