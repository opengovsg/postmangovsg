import React, { useContext } from 'react'
import { Redirect } from 'react-router-dom'

import Login from './login'
import { AuthContext } from 'contexts/auth.context'

import styles from './Landing.module.scss'
import landingImg from 'assets/img/landing.png'
import appLogo from 'assets/img/app-logo.png'
import ogpLogo from 'assets/img/ogp-logo.svg'

const Landing = () => {
  const authContext = useContext(AuthContext)

  if (authContext.isAuthenticated) {
    return (
      <Redirect to='/campaigns'></Redirect>
    )
  }

  return (
    <React.Fragment>
      <div className={styles.topContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.landingImg}>
            <img src={landingImg} alt="Landing page graphic"></img>
          </div>
          <div className={styles.textContainer}>
            <img className={styles.appLogo} src={appLogo} alt="Postman logo"></img>
            <h1 className={styles.title}>POSTMAN</h1>
            <Login></Login>
          </div>
        </div>
      </div >
      <div className={styles.bottomContainer}>
        <div className={styles.linkBar}>
          <p className={styles.navTitle}>Postman Admin Panel</p>
          <a className={styles.navLink} href="/">Guide</a>
          <a className={styles.navLink} href="/">Contact Us</a>
        </div>
        <img className={styles.ogpLogo} src={ogpLogo} alt="OGP"></img>
      </div>
    </React.Fragment>
  )
}

export default Landing