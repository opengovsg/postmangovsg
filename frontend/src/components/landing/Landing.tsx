import React, { useContext } from 'react'
import { Redirect } from 'react-router-dom'

import Login from './login'
import { GUIDE_URL, CONTACT_US_URL } from 'config'
import PrimaryButton from 'components/common/primary-button'
import Navbar from './nav-bar'
import { AuthContext } from 'contexts/auth.context'

import styles from './Landing.module.scss'
import landingImg from 'assets/img/landing.svg'
import appLogo from 'assets/img/brand/app-logo.svg'
import companyLogo from 'assets/img/brand/company-logo.svg'
import arrowRight from 'assets/img/arrow-right.svg'
import ogpLogo from 'assets/img/ogp-logo.svg'
import mohAgency from 'assets/img/moh.png'

const Landing = () => {
  const authContext = useContext(AuthContext)

  if (authContext.isAuthenticated) {
    return (
      <Redirect to='/campaigns'></Redirect>
    )
  }

  function directToSignIn() {
    window.location.href = '/signin'
  }

  return (
    <>
      <Navbar></Navbar>
      <div className={styles.topContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.textContainer}>
            <h1 className={styles.headerText}>Reach out to the citizens in minutes</h1>
            <h2 className={styles.sentMessages}>
              <span className={styles.numOfMessages}>275000 </span>
              sent messages
            </h2>
            <div className={styles.signInRow}>
              <PrimaryButton className={styles.signInButton} onClick={directToSignIn}>
                Sign in <img className={styles.arrowRight} src={arrowRight}/>
              </PrimaryButton>
              <span className={styles.needHelp}>Need help?</span>
              <a className={styles.contactUs} href={CONTACT_US_URL}>Talk to us</a>
            </div>
          </div>
          <div className={styles.landingImg}>
            <img src={landingImg} alt="Landing page graphic"></img>
          </div>
        </div>
        <div className={styles.agencyContainer}>
            <h2 className={styles.agencyHeader}>Trusted by these agencies</h2>
            <div className={styles.agencies}>
              <img src={mohAgency} alt=""/>
              <img src={mohAgency} alt=""/>
              <img src={mohAgency} alt=""/>
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