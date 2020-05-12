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
import mohAgency from 'assets/img/landing/moh.png'

// how it works
import chooseChannelImg from 'assets/img/landing/choose-channel.svg'
import createMessageImg from 'assets/img/landing/create-message.svg'
import uploadContactsImg from 'assets/img/landing/upload-contacts.svg'
import sendMessageImg from 'assets/img/landing/send-message.svg'

import reliableImg from 'assets/img/landing/WhyUsePostman-1.svg'
import reattemptImg from 'assets/img/landing/WhyUsePostman-2.svg'
import trackImg from 'assets/img/landing/WhyUsePostman-3.svg'
import faceImg from 'assets/img/landing/WhyUsePostman-face.png'

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

  // how it works
  function directToGuide() {
    window.location.href = POSTMAN_GUIDE_URL
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

      <div className={styles.howItWorks}>
        <h1>How it works</h1>
        <h2>Send mass messages to citizens with minimum setup required</h2>

        <div className={styles.features}>
          <div className={styles.feature}>
            <img src={chooseChannelImg} alt="Choose channel"/>
            <h3>Choose Channel</h3>
            <span className={styles.featureText}>Select either SMS or email and name the campaign</span>
          </div>
          
          <div className={styles.feature}>
            <img src={createMessageImg} alt="Create message"/>
            <h3>Create Message</h3>
            <span className={styles.featureText}>Personalise messages using attributes</span>
          </div>

          <div className={styles.feature}>
            <img src={uploadContactsImg} alt="Upload contacts"/>
            <h3>Upload Contacts</h3>
            <span className={styles.featureText}>Upload recipients list in CSV format</span>
          </div>

          <div className={styles.feature}>
            <img src={sendMessageImg} alt="Send message"/>
            <h3>Send Message</h3>
            <span className={styles.featureText}>Do a test send before mass sendout</span>
          </div>
        </div>

        <PrimaryButton className={styles.learnMoreBtn} onClick={directToGuide}>
          Learn more <img className={styles.arrowRight} src={arrowRight} alt="Right arrow"/>
        </PrimaryButton>
      </div>

      <div className={styles.whyUsePostman}>
        <div className={styles.innerContainer}>
          <h1>Why use Postman</h1>
          <div className={styles.reason}>
            <img src={reliableImg} alt="Reliable"/>
            <div className={styles.textContainer}>
              <h3>Reliable</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore</p>
            </div>
          </div>

          <div className={styles.reason}>
            <div className={styles.textContainer}>
              <h3>Reattempt delivery</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore</p>
            </div>
            <img src={reattemptImg} alt="Reattempt delivery"/>
          </div>

          <div className={styles.reason}>
            <img src={trackImg} alt="Track engagement"/>
            <div className={styles.textContainer}>
              <h3>Track engagement</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore</p>
            </div>
          </div>

          <div className={styles.testimonial}>
            <img src={faceImg} alt="User's face"/>
            <div className={styles.textContainer}>
              <h3>Lorem ipsum dolor sit amet</h3>
              <p className={styles.longText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Tellus id interdum velit laoreet id donec ultrices. Amet cursus sit amet dictum sit amet justo donec enim. Mi proin sed libero enim. Aenean et tortor at risus viverra adipiscing at in. Lectus vestibulum mattis ullamcorper velit.</p>
              <span>Lorem ipsum dolor, Agency A</span>
            </div>
          </div>          
        </div>
      </div>
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