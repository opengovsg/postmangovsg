import React, { useContext } from 'react'
import { Redirect } from 'react-router-dom'

import Login from './login'
import { GUIDE_URL, CONTACT_US_URL } from 'config'
import Navbar from './nav-bar'
import { AuthContext } from 'contexts/auth.context'

import styles from './Landing.module.scss'
import landingImg from 'assets/img/landing.svg'
import appLogo from 'assets/img/brand/app-logo.svg'
import companyLogo from 'assets/img/brand/company-logo.svg'

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
        <Navbar></Navbar>
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
          <img className={styles.companyLogo} src={companyLogo} alt="OGP"></img>
          <div className={styles.linkBar}>
            <a className={styles.navLink} href={GUIDE_URL} target="_blank" rel="noopener noreferrer">Guide</a>
            <a className={styles.navLink} href={CONTACT_US_URL} target="_blank" rel="noopener noreferrer">Contact Us</a>
          </div>
        </div>
      </div>
    </>
  )
}

export default Landing