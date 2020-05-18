import React, { useContext } from 'react'
import { Redirect } from 'react-router-dom'

import LoginInput from './login-input'
import { POSTMAN_GUIDE_URL, CONTACT_US_URL } from 'config'
import { AuthContext } from 'contexts/auth.context'

import styles from './Login.module.scss'
import landingImg from 'assets/img/landing.svg'
import appLogo from 'assets/img/app-logo.svg'
import ogpLogo from 'assets/img/ogp-logo.svg'

const Landing = () => {
  const authContext = useContext(AuthContext)

  if (authContext.isAuthenticated) {
    return (
      <Redirect to='/campaigns'></Redirect>
    )
  }

  return (
    <>
      <div className={styles.topContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.textContainer}>
            <img className={styles.appLogo} src={appLogo} alt="Postman logo"></img>
            <LoginInput></LoginInput>
          </div>
          <div className={styles.landingImg}>
            <img src={landingImg} alt="Landing page graphic"></img>
          </div>
        </div>
      </div >
      <div className={styles.bottomContainer}>
        <div className={styles.bottomContent}>
          <img className={styles.ogpLogo} src={ogpLogo} alt="OGP"></img>
          <div className={styles.linkBar}>
            <a className={styles.navLink} href={POSTMAN_GUIDE_URL} target="_blank" rel="noopener noreferrer">Guide</a>
            <a className={styles.navLink} href={CONTACT_US_URL} target="_blank" rel="noopener noreferrer">Contact Us</a>
          </div>
        </div>
      </div>
    </>
  )
}

export default Landing