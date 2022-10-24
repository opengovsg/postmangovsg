import { createRef, useContext, useEffect } from 'react'
import { OutboundLink } from 'react-ga'
import { Navigate } from 'react-router-dom'
import { i18n } from '@lingui/core'
import appLogo from 'assets/img/brand/app-logo.svg'
import companyLogo from 'assets/img/brand/company-logo-dark.svg'
import loginImg from 'assets/img/landing/login.png'
import { InfoBanner } from 'components/common'
import { LINKS } from 'config'
import { AuthContext } from 'contexts/auth.context'

import styles from './Login.module.scss'
import LoginInput from './login-input'

const Login = () => {
  const authContext = useContext(AuthContext)
  const infoBannerRef = createRef<HTMLDivElement>()

  useEffect(() => {
    function recalculateBannerPos() {
      const scrollTop = (document.documentElement.scrollTop ||
        document.body.scrollTop) as number
      if (infoBannerRef.current) {
        const infoBannerHeight = infoBannerRef.current?.offsetHeight as number
        if (scrollTop > infoBannerHeight) {
          infoBannerRef.current.style.position = 'fixed'
        } else {
          infoBannerRef.current.style.position = 'relative'
        }
      }
    }
    window.addEventListener('scroll', recalculateBannerPos)
    return () => {
      window.removeEventListener('scroll', recalculateBannerPos)
    }
  })

  if (authContext.isAuthenticated) {
    return <Navigate to="/campaigns" />
  }

  return (
    <>
      <InfoBanner innerRef={infoBannerRef} />
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
