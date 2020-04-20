import React, { useContext } from 'react'
import { Redirect } from 'react-router-dom'

import Login from './login'
import { AuthContext } from 'contexts/auth.context'

import styles from './Landing.module.scss'
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
            <Login></Login>
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
            <a className={styles.navLink} href="/">Guide</a>
            <a className={styles.navLink} href="/">Contact Us</a>
          </div>
        </div>
      </div>
    </>
  )
}

export default Landing