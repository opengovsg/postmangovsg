import React, { useContext } from 'react'
import { Redirect } from 'react-router-dom'
import { OutboundLink } from 'react-ga'

import LoginInput from './login-input'
import { LINKS, INFO_BANNER } from 'config'
import { AuthContext } from 'contexts/auth.context'
import { InfoBanner } from 'components/common'
import styles from './Login.module.scss'
import loginImg from 'assets/img/landing/login.svg'
import appLogo from 'assets/img/brand/app-logo.svg'
import companyLogo from 'assets/img/brand/company-logo-dark.svg'
import { i18n } from 'locales'

const Login = () => {
  const authContext = useContext(AuthContext)

  if (authContext.isAuthenticated) {
    return <Redirect to="/campaigns"></Redirect>
  }

  return (
    <>
      <InfoBanner>{INFO_BANNER}</InfoBanner>
      <div className={styles.topContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.textContainer}>
            <img
              className={styles.appLogo}
              src={appLogo}
              alt="Postman logo"
            ></img>
            <LoginInput></LoginInput>
          </div>
          <div className={styles.landingImg}>
            <img src={loginImg} alt="Landing page graphic"></img>
          </div>
        </div>
      </div>
      <div className={styles.bottomContainer}>
        <div className={styles.bottomContent}>
          <img
            className={styles.companyLogo}
            src={companyLogo}
            alt="company logo"
          ></img>
          <div className={styles.linkBar}>
            <OutboundLink
              className={styles.navLink}
              eventLabel={i18n._(LINKS.guideUrl)}
              to={i18n._(LINKS.guideUrl)}
              target="_blank"
            >
              Guide
            </OutboundLink>
            <OutboundLink
              className={styles.navLink}
              eventLabel={i18n._(LINKS.contactUsUrl)}
              to={i18n._(LINKS.contactUsUrl)}
              target="_blank"
            >
              Contact Us
            </OutboundLink>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login
